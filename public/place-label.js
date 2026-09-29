// A place in a ranking as one whole text, so every language can translate it (29 Sep 2026): "1st" + " place" came out as
// "1st. Platz" or "1st位". Beyond the podium it reads "Place 4", which also avoids "21th".
export const PODIUM_PLACES=Object.freeze(['1st place','2nd place','3rd place']);
export const placeLabel=rank=>PODIUM_PLACES[rank-1]??`Place ${rank}`;
