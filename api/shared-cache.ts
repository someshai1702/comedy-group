// Shared cache for RSVPs across API routes
// Vercel serverless functions may share memory within the same container

interface RSVP {
  eventId: string;
  familyId: string;
  attending: string;
  reason: string;
  adultsAttendingCount: number;
  childrenAttendingCount: number;
  order: { [key: string]: number };
  specialInstructions: string;
  updatedAt: string;
}

// Global cache - persists across invocations in same container
let rsvpsCache: RSVP[] = [];

export function getRsvpsCache(): RSVP[] {
  return rsvpsCache;
}

export function setRsvpsCache(rsvps: RSVP[]): void {
  rsvpsCache = rsvps;
}

export function addOrUpdateRsvp(rsvp: RSVP): void {
  const index = rsvpsCache.findIndex(
    r => r.eventId === rsvp.eventId && r.familyId === rsvp.familyId
  );
  if (index >= 0) {
    rsvpsCache[index] = rsvp;
  } else {
    rsvpsCache.push(rsvp);
  }
}
