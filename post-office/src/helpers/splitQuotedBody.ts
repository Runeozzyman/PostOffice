export function splitQuotedBody(body: string) {
  const markers = [
    /\n\nOn .+ wrote:\n/,
    /\n\n---------- Forwarded message ----------\n/,
  ];
  let index = -1;

  for (const marker of markers) {
    const match = body.search(marker);
    if (match !== -1 && (index === -1 || match < index)) {
      index = match;
    }
  }

  if (index === -1) {
    return { before: body, after: "" };
  }

  return { before: body.slice(0, index), after: body.slice(index) };
}
