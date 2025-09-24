export type Brand = {
  id: string; // slug or Firestore doc id
  name: string; // canonical display name
  searchableName: string; // lowercase/stripped for quick client search
  visible: boolean; // controls kiosk visibility
  order?: number; // optional manual sort
  aliases?: string[]; // optional search helpers
  logoUrl?: string; // optional
};
