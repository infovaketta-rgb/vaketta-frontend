export type StatWithTrend = {
  value: number;
  trendPercent: number | null;
};

export type DashboardPayload = {
  stats: {
    todayRevenue: StatWithTrend;
    totalBookings: StatWithTrend;
    activeGuests24h: StatWithTrend;
    pendingBookings: StatWithTrend;
  };
  revenueLast7Days: { date: string; revenue: number }[];
  bookingsLast7Days: { date: string; count: number }[];
  recentBookings: {
    id: string;
    guestName: string;
    roomTypeName: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    status: string;
  }[];
};
