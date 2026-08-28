let userDataPath = "";

export function setUserDataPath(next: string) {
  userDataPath = next;
}

export function getUserDataPath() {
  if (!userDataPath) {
    throw new Error("User data path has not been configured.");
  }

  return userDataPath;
}
