const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export function createId(prefix: string, byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return `${prefix}_${bytesToBase64Url(bytes)}`;
}

export function createFamilyId() {
  return createId("fam");
}
