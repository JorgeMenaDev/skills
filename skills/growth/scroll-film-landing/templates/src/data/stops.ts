// One entry per stop, in film order. N stops need N-1 clips (media/clips/raw/clip-1.mp4 … clip-(N-1).mp4).
// `focus` is the horizontal object-position (0–100) used when a portrait screen crops the 16:9 frame.
export type Stop = { id: string; place: string; focus: number };

export const stops: Stop[] = [
  { id: 'top', place: 'Arrive', focus: 50 },
  { id: 'first', place: 'First room', focus: 50 },
  { id: 'second', place: 'Second room', focus: 50 },
  { id: 'third', place: 'Third room', focus: 50 },
];
