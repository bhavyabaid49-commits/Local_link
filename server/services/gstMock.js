const mockBusinesses = {
  "29ABCDE1234F1ZW": {
    legalName: "Koramangala Kitchen Foods LLP",
    tradeName: "MTR Local Kitchen",
    state: "Karnataka",
    status: "Active",
  },
  "29AACCC1234G1Z4": {
    legalName: "Indiranagar Table Private Limited",
    tradeName: "Indiranagar Table",
    state: "Karnataka",
    status: "Active",
  },
  "29AAACH1234H1Z3": {
    legalName: "HSR Bowl House LLP",
    tradeName: "HSR Bowl House",
    state: "Karnataka",
    status: "Active",
  },
  "29AAACJ1234J1Z2": {
    legalName: "Jayanagar Pantry Private Limited",
    tradeName: "Jayanagar Pantry",
    state: "Karnataka",
    status: "Active",
  },
};

export async function verifyGstin(gstin) {
  return (
    mockBusinesses[gstin] || {
      legalName: `GST registered business ${gstin.slice(0, 4)}`,
      tradeName: "Local Link applicant",
      state: "Karnataka",
      status: "Active",
    }
  );
}
