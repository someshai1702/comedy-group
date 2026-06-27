export interface Family {
  id: string;
  name: string;
  adults: string[];
  children: string[];
  pin: string;
  photoUrl: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export interface Menu {
  starters: MenuItem[];
  mainCourse: MenuItem[];
  roti: MenuItem[];
  rice: MenuItem[];
  dessert: MenuItem[];
  drinks: MenuItem[];
}

export interface Event {
  id: string;
  name: string;
  type: "Birthday" | "Anniversary" | "Holiday Dinner" | "Festival Celebration" | "Weekend Dinner" | "Regular Dinner" | "Movie" | "Other";
  hostFamilyId: string;
  date: string;
  time: string;
  restaurant: string;
  address: string;
  googleMapsUrl: string;
  deadline: string;
  notes: string;
  isActive: boolean;
  // Movie-specific fields
  movieName?: string;
  movieVenue?: string;
  movieShowtime?: string;
}

export interface RSVP {
  eventId: string;
  familyId: string;
  attending: "Yes" | "No" | "Maybe";
  reason: string;
  adultsAttendingCount: number;
  childrenAttendingCount: number;
  order: { [itemId: string]: number };
  specialInstructions: string;
  updatedAt: string;
}

export interface GroupNotification {
  id: string;
  eventId: string | null;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
  createdAt: string;
}

export interface DbState {
  families: Family[];
  menu: Menu;
  events: Event[];
  rsvps: RSVP[];
  notifications: GroupNotification[];
}
