// All the app's seed/mock data lives here — nothing else in the app
// talks to a server, so this file *is* the database.

export const SPECIALTIES = ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Dermatology", "ENT", "General Medicine"];

export const INITIAL_DOCTORS = [
  { id: "d1", name: "Dr. Sarah Chen", specialty: "Cardiology", room: "Room 201", available: true, queueCount: 5, avgWait: 12, rating: 4.9, photo: "photo-1559839734-2b71ea197ec2" },
  { id: "d2", name: "Dr. Marcus Reid", specialty: "Neurology", room: "Room 305", available: true, queueCount: 3, avgWait: 18, rating: 4.7, photo: "photo-1612349317150-e413f6a5b16d" },
  { id: "d3", name: "Dr. Priya Nair", specialty: "Pediatrics", room: "Room 102", available: true, queueCount: 8, avgWait: 8, rating: 4.8, photo: "photo-1582750433449-648ed127bb54" },
  { id: "d4", name: "Dr. James Okafor", specialty: "Orthopedics", room: "Room 410", available: false, queueCount: 0, avgWait: 0, rating: 4.6, photo: "photo-1537368910025-700350fe46c7", unavailableUntil: "3:00 PM" },
  { id: "d5", name: "Dr. Layla Hassan", specialty: "Dermatology", room: "Room 208", available: true, queueCount: 4, avgWait: 15, rating: 4.9, photo: "photo-1594824476967-48c8b964273f" },
  { id: "d6", name: "Dr. Tom Eriksson", specialty: "ENT", room: "Room 316", available: true, queueCount: 2, avgWait: 10, rating: 4.5, photo: "photo-1622253692010-333f2da6031d" },
  { id: "d7", name: "Dr. Aisha Mbeki", specialty: "General Medicine", room: "Room 101", available: true, queueCount: 11, avgWait: 6, rating: 4.7, photo: "photo-1551601651-2a8555f1a136" },
  { id: "d8", name: "Dr. Carlos Vega", specialty: "Cardiology", room: "Room 202", available: true, queueCount: 6, avgWait: 14, rating: 4.8, photo: "photo-1480429370139-e0132c086e2a" },
];

// Token letter prefix per doctor
export const DOCTOR_TOKEN_PREFIX = {
  d1: "A", d2: "B", d3: "C", d4: "D", d5: "E", d6: "F", d7: "G", d8: "H",
};

// Email -> doctor ID mapping, so doctor login doesn't need a role dropdown
export const DOCTOR_EMAILS = {
  "sarah.chen@medqueue.hospital": "d1",
  "marcus.reid@medqueue.hospital": "d2",
  "priya.nair@medqueue.hospital": "d3",
  "james.okafor@medqueue.hospital": "d4",
  "layla.hassan@medqueue.hospital": "d5",
  "tom.eriksson@medqueue.hospital": "d6",
  "aisha.mbeki@medqueue.hospital": "d7",
  "carlos.vega@medqueue.hospital": "d8",
};

// Diverse patient name pool used to seed realistic-looking queues
export const PATIENT_NAME_POOL = [
  "Ratan Mitra", "Fatima Al-Rashid", "Leon Park", "Mei Zhang", "Daniel Osei",
  "Sara Johansson", "Raj Patel", "Aiko Tanaka", "Carlos Mendes", "Yuki Yamamoto",
  "Priya Krishnan", "James Muller", "Amara Diallo", "Chen Wei", "Sofia Herrera",
  "Omar Shaikh", "Anya Petrova", "Kwame Asante", "Layla Ibrahim", "Tom Eriksson",
  "Nadia Vlasova", "Hiroshi Tanaka", "Grace Okonkwo", "Alex Nguyen", "Inara Patel",
];

// Builds a starting queue for a doctor: one "in-progress" token plus
// however many "waiting" tokens match the doctor's queueCount.
export function buildDoctorQueue(doctor) {
  const prefix = DOCTOR_TOKEN_PREFIX[doctor.id] ?? "Z";
  const wait = doctor.avgWait;
  const offset = parseInt(doctor.id.replace("d", ""), 10) - 1;
  const names = [...PATIENT_NAME_POOL.slice(offset * 3, offset * 3 + 8), ...PATIENT_NAME_POOL.slice(0, 3)];

  const tokens = [];
  const count = Math.max(1, doctor.queueCount);

  tokens.push({
    id: `${doctor.id}-t1`,
    number: `${prefix}01`,
    patientName: names[0],
    doctorId: doctor.id,
    status: "in-progress",
    position: 1,
    isEmergency: false,
    estimatedWait: 0,
    createdAt: "09:05 AM",
  });

  for (let i = 1; i < count; i++) {
    const num = String(i + 1).padStart(2, "0");
    const hr = 9 + Math.floor((i * wait) / 60);
    const min = String((i * wait) % 60).padStart(2, "0");
    tokens.push({
      id: `${doctor.id}-t${i + 1}`,
      number: `${prefix}${num}`,
      patientName: names[i % names.length],
      doctorId: doctor.id,
      status: "waiting",
      position: i + 1,
      isEmergency: i === 1 && doctor.specialty === "Cardiology",
      estimatedWait: i * wait,
      createdAt: `${String(hr).padStart(2, "0")}:${min} AM`,
    });
  }
  return tokens;
}

export const CHART_COLORS = ["#06b6d4", "#0ea5e9", "#6366f1", "#10b981", "#f59e0b"];

export const analyticsData = {
  daily: [
    { day: "Mon", patients: 142, completed: 138 },
    { day: "Tue", patients: 168, completed: 161 },
    { day: "Wed", patients: 195, completed: 188 },
    { day: "Thu", patients: 152, completed: 148 },
    { day: "Fri", patients: 210, completed: 201 },
    { day: "Sat", patients: 89, completed: 86 },
    { day: "Sun", patients: 62, completed: 60 },
  ],
  waitTimes: [
    { hour: "8AM", wait: 5 }, { hour: "9AM", wait: 12 }, { hour: "10AM", wait: 18 },
    { hour: "11AM", wait: 22 }, { hour: "12PM", wait: 15 }, { hour: "1PM", wait: 8 },
    { hour: "2PM", wait: 14 }, { hour: "3PM", wait: 19 }, { hour: "4PM", wait: 11 },
  ],
  specialties: [
    { name: "Cardiology", value: 28 }, { name: "Neurology", value: 18 },
    { name: "Pediatrics", value: 22 }, { name: "Orthopedics", value: 14 },
    { name: "Other", value: 18 },
  ],
};

export const UNSPLASH_DOCTOR_PHOTOS = [
  "photo-1559839734-2b71ea197ec2",
  "photo-1612349317150-e413f6a5b16d",
  "photo-1582750433449-648ed127bb54",
  "photo-1537368910025-700350fe46c7",
  "photo-1594824476967-48c8b964273f",
  "photo-1622253692010-333f2da6031d",
  "photo-1551601651-2a8555f1a136",
  "photo-1480429370139-e0132c086e2a",
  "photo-1527613426441-4da17471b66d",
  "photo-1607990283143-e81e7a2c9349",
];

export const PATIENT_REPORTS = [
  { id: "r1", patientName: "Ratan Mitra", patientId: "PAT-1023", doctorId: "d1", date: "28 Jul 2025", time: "09:15 AM", specialty: "Cardiology", diagnosis: "Mild hypertension — lifestyle modifications recommended. BP: 138/88 mmHg.", prescription: "Amlodipine 5mg OD, low-sodium diet, 30 min daily walk.", followUp: "4 weeks", status: "completed" },
  { id: "r2", patientName: "Fatima Al-Rashid", patientId: "PAT-2047", doctorId: "d1", date: "27 Jul 2025", time: "10:30 AM", specialty: "Cardiology", diagnosis: "Palpitations — benign cause confirmed by ECG. No structural abnormality.", prescription: "Propranolol 10mg PRN. Avoid caffeine.", followUp: "2 months", status: "completed" },
  { id: "r3", patientName: "Leon Park", patientId: "PAT-3301", doctorId: "d2", date: "28 Jul 2025", time: "11:00 AM", specialty: "Neurology", diagnosis: "Tension headaches. No red-flag features on neurological exam.", prescription: "Ibuprofen 400mg PRN, tension-release exercises.", followUp: "6 weeks", status: "completed" },
  { id: "r4", patientName: "Mei Zhang", patientId: "PAT-4412", doctorId: "d3", date: "28 Jul 2025", time: "09:45 AM", specialty: "Pediatrics", diagnosis: "Viral URTI — mild pharyngitis. Temp 37.8°C.", prescription: "Paracetamol syrup, rest, oral fluids. No antibiotics needed.", followUp: "Return if fever >38.5°C", status: "completed" },
  { id: "r5", patientName: "Daniel Osei", patientId: "PAT-5508", doctorId: "d5", date: "26 Jul 2025", time: "02:15 PM", specialty: "Dermatology", diagnosis: "Contact dermatitis — suspected nickel allergy.", prescription: "Hydrocortisone 1% cream BD x 1 week, patch testing referral.", followUp: "3 weeks", status: "completed" },
  { id: "r6", patientName: "Sara Johansson", patientId: "PAT-6614", doctorId: "d6", date: "25 Jul 2025", time: "03:00 PM", specialty: "ENT", diagnosis: "Otitis externa — left ear. Mild tenderness and discharge.", prescription: "Ear drops (Ciprofloxacin + Dexamethasone) BD x 7 days. Keep ear dry.", followUp: "1 week", status: "completed" },
  { id: "r7", patientName: "Raj Patel", patientId: "PAT-7720", doctorId: "d7", date: "24 Jul 2025", time: "10:00 AM", specialty: "General Medicine", diagnosis: "Type 2 Diabetes — HbA1c 7.9%. Medication adjustment needed.", prescription: "Metformin 1000mg BD, dietary counselling. Repeat HbA1c in 3 months.", followUp: "3 months", status: "completed" },
  { id: "r8", patientName: "Aiko Tanaka", patientId: "PAT-8835", doctorId: "d8", date: "28 Jul 2025", time: "11:45 AM", specialty: "Cardiology", diagnosis: "Post-MI follow-up. Stable. Echo shows EF 52%.", prescription: "Continue Atorvastatin, Aspirin, Ramipril. Cardiac rehab advised.", followUp: "6 weeks", status: "completed" },
];
