/**
 * Manual/offline payment submission form.
 *
 * Locks in that this form submits a CLAIM, not a payment:
 *  - the copy tells the hotel the invoice stays open until verified, so nobody
 *    leaves believing their subscription is already renewed;
 *  - the client never sends a status, and cannot request one;
 *  - amount is capped at the outstanding balance client-side as a courtesy
 *    (the server re-derives and rejects independently);
 *  - a reference is mandatory for every method except CASH;
 *  - proof is restricted by type and size before upload is attempted.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...a: any[]) => apiFetch(...a) }));

import ManualPaymentModal from "./ManualPaymentModal";

const INVOICE = {
  id: "inv_1",
  number: "INV-2026-00001",
  currency: "INR",
  total: 249900,
  amountPaid: 0,
};

const onClose = vi.fn();
const onSubmitted = vi.fn();

function renderModal(invoice = INVOICE) {
  return render(<ManualPaymentModal invoice={invoice} onClose={onClose} onSubmitted={onSubmitted} />);
}

/** Pull the FormData the component posted. */
function submittedForm(): FormData {
  const call = apiFetch.mock.calls.find((c) => String(c[0]).includes("manual-payment"))!;
  return call[1].body as FormData;
}

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({ paymentId: "pay_1", status: "PENDING" });
  onClose.mockReset();
  onSubmitted.mockReset();
});

describe("expectation setting", () => {
  it("says the invoice stays open until the payment is verified", () => {
    renderModal();
    expect(screen.getByText(/verify this against our bank records/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice stays\s+open until it's confirmed/i)).toBeInTheDocument();
  });

  it("labels the action as submitting for review, not paying", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /submit for review/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^pay/i })).not.toBeInTheDocument();
  });

  it("shows the outstanding balance and says partial payments are accepted", () => {
    renderModal();
    expect(screen.getByText(/partial payments are accepted/i)).toBeInTheDocument();
  });
});

describe("submission", () => {
  it("posts amount in MINOR units with the claim fields", async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText(/reference/i), "UTR123456");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalled());

    const form = submittedForm();
    expect(form.get("amount")).toBe("249900");
    expect(form.get("method")).toBe("BANK_TRANSFER");
    expect(form.get("reference")).toBe("UTR123456");
    expect(form.get("claimedPaidAt")).toBeTruthy();
  });

  it("NEVER sends a status — the server always decides PENDING", async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText(/reference/i), "UTR1");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(submittedForm().get("status")).toBeNull();
  });

  it("posts to the tenant-scoped invoice route", async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText(/reference/i), "UTR1");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/hotel-settings/billing/invoices/inv_1/manual-payment",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("notifies the parent and closes on success", async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText(/reference/i), "UTR1");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it("surfaces a server refusal without closing", async () => {
    apiFetch.mockRejectedValueOnce(new Error("A payment for this invoice is already under review."));
    renderModal();
    await userEvent.type(screen.getByLabelText(/reference/i), "UTR1");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/already under review/i));
    expect(onClose).not.toHaveBeenCalled();
    expect(onSubmitted).not.toHaveBeenCalled();
  });
});

describe("client-side guards", () => {
  it("REJECTS more than the outstanding balance without calling the API", async () => {
    renderModal();
    const amount = screen.getByLabelText(/amount/i);
    await userEvent.clear(amount);
    await userEvent.type(amount, "99999");
    await userEvent.type(screen.getByLabelText(/reference/i), "UTR1");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/more than the/i));
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("rejects a zero or empty amount", async () => {
    renderModal();
    const amount = screen.getByLabelText(/amount/i);
    await userEvent.clear(amount);
    await userEvent.type(amount, "0");
    await userEvent.type(screen.getByLabelText(/reference/i), "UTR1");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("ALLOWS a partial payment", async () => {
    renderModal();
    const amount = screen.getByLabelText(/amount/i);
    await userEvent.clear(amount);
    await userEvent.type(amount, "1000");
    await userEvent.type(screen.getByLabelText(/reference/i), "UTR1");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(submittedForm().get("amount")).toBe("100000");
  });

  it("measures against the REMAINING balance on a part-paid invoice", async () => {
    renderModal({ ...INVOICE, amountPaid: 200000 }); // ₹499 left
    const amount = screen.getByLabelText(/amount/i);
    await userEvent.clear(amount);
    await userEvent.type(amount, "600");
    await userEvent.type(screen.getByLabelText(/reference/i), "UTR1");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("REQUIRES a reference for bank transfer", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/reference/i));
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("does NOT require a reference for cash", async () => {
    renderModal();
    await userEvent.selectOptions(screen.getByLabelText(/payment method/i), "CASH");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
  });
});

describe("proof upload", () => {
  const file = (name: string, type: string, size = 100) => {
    const f = new File(["x".repeat(size)], name, { type });
    Object.defineProperty(f, "size", { value: size });
    return f;
  };

  it("accepts a PNG and sends it with the form", async () => {
    renderModal();
    await userEvent.upload(screen.getByLabelText(/proof/i), file("slip.png", "image/png"));
    await userEvent.type(screen.getByLabelText(/reference/i), "UTR1");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(submittedForm().get("proof")).toBeInstanceOf(File);
  });

  it("REJECTS a disallowed file type before upload", async () => {
    // fireEvent, not userEvent.upload: userEvent honours the input's `accept`
    // attribute and silently drops the file, so it would never exercise the JS
    // guard. `accept` is only a picker hint — a real browser can still deliver
    // a disallowed file via drag-and-drop or devtools, which is exactly what
    // this guard is for.
    renderModal();
    const input = screen.getByLabelText(/proof/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file("payload.exe", "application/x-msdownload")] } });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/JPEG, PNG or WebP/i));
  });

  it("does not attach a rejected file to the submission", async () => {
    renderModal();
    const input = screen.getByLabelText(/proof/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file("payload.exe", "application/x-msdownload")] } });
    await userEvent.type(screen.getByLabelText(/reference/i), "UTR1");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(submittedForm().get("proof")).toBeNull();
  });

  it("REJECTS a file over 10 MB", async () => {
    renderModal();
    const input = screen.getByLabelText(/proof/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file("huge.pdf", "application/pdf", 11 * 1024 * 1024)] } });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/10 MB or smaller/i));
  });

  it("is optional — submission works with no proof", async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText(/reference/i), "UTR1");
    await userEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(submittedForm().get("proof")).toBeNull();
  });
});
