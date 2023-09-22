import objectPath from "object-path";
import moment from "moment";

export interface Parameters {
  service: string;
  username: string;
  project: string;
  branch: string;
  property: string;
}

export interface Fields {
  [key: string]: string;
}

export interface Body {
  [key: string]: Fields[];
}

export function resolvePlaceholder(subject: string, baseObject: object): string {
  const matches = subject.match(/{(.*?)}/g);
  matches?.forEach((match) => {
    const escapedMatch = match.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
    const property = match.slice(1, -1);

    let newText: string;
    switch (property) {
      case "@timestamp":
        newText = new Date().getTime().toString();

        break;

      case "@id":
        newText = crypto.randomUUID();

        break;

      default: {
        const timeIdentifier = "@date:";

        if (property.indexOf(timeIdentifier) === 0) {
          const timePattern = property.slice(timeIdentifier.length);

          newText = moment().format(timePattern);
        } else {
          newText = objectPath.get(baseObject, property) || "";
        }
      }
    }

    subject = subject.replace(new RegExp(escapedMatch, "g"), newText);
  });

  return subject;
}
