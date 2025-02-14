import { ReaderListener } from ".";
import { Directory, DirectorySync, Entry, EntrySync, Reader } from "./api";
import { ReaderListeners } from "./listeners";

export class StackedReader implements Reader {
  readonly listeners = new ReaderListeners();

  private readonly asReaderListener: ReaderListener;

  constructor(private readonly readers: Reader[]) {
    const self = this;
    this.asReaderListener = {
      get observedPaths() {
        return self.listeners.observedFilePaths;
      },
      onChange(filePath, info) {
        self.listeners.notify(filePath, info);
      },
    };
    for (const reader of this.readers) {
      reader.listeners.add(this.asReaderListener);
    }
  }

  async read(filePath: string): Promise<Entry | null> {
    const found = await Promise.all(
      this.readers.map((reader) => reader.read(filePath))
    );
    return merge(found);
  }

  readSync(filePath: string): EntrySync | null {
    const found = this.readers.map((reader) => reader.readSync(filePath));
    return mergeSync(found);
  }
}

function merge(entries: Array<Entry | null>): Entry | null {
  const mergedDirectories: Directory[] = [];
  for (const entry of entries) {
    if (!entry) {
      continue;
    }
    if (entry.kind === "file") {
      // Return the first match.
      return entry;
    }
    mergedDirectories.push(entry);
  }
  const [first] = mergedDirectories;
  if (!first) {
    return null;
  }
  return {
    kind: "directory",
    name: first.name,
    entries: async () => {
      const names = new Set<string>();
      const uniques: Entry[] = [];
      for (const directoryEntries of mergedDirectories.map((d) =>
        d.entries()
      )) {
        for (const entry of await directoryEntries) {
          if (names.has(entry.name)) {
            continue;
          }
          names.add(entry.name);
          uniques.push(entry);
        }
      }
      return uniques;
    },
  };
}

function mergeSync(entries: Array<EntrySync | null>): EntrySync | null {
  const mergedDirectories: DirectorySync[] = [];
  for (const entry of entries) {
    if (!entry) {
      continue;
    }
    if (entry.kind === "file") {
      // Return the first match.
      return entry;
    }
    mergedDirectories.push(entry);
  }
  const [first] = mergedDirectories;
  if (!first) {
    return null;
  }
  return {
    kind: "directory",
    name: first.name,
    entries: () => {
      const names = new Set<string>();
      const uniques: EntrySync[] = [];
      for (const directoryEntries of mergedDirectories.map((d) =>
        d.entries()
      )) {
        for (const entry of directoryEntries) {
          if (names.has(entry.name)) {
            continue;
          }
          names.add(entry.name);
          uniques.push(entry);
        }
      }
      return uniques;
    },
  };
}
