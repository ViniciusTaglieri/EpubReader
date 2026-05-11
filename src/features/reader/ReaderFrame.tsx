import { forwardRef } from "react";
import { AppMessage, type AppMessageData } from "../../shared/components/AppMessage";
import type { EpubManifestDto, ResourceDto } from "../../shared/types/books";
import { buildReaderDocument } from "./readerDocument";

type ReaderFrameProps = {
  manifest: EpubManifestDto | null;
  resource: ResourceDto | null;
  message: AppMessageData | null;
  background: string;
  onDismissMessage: () => void;
  onLoad: () => void;
};

export const ReaderFrame = forwardRef<HTMLIFrameElement, ReaderFrameProps>(
  function ReaderFrame(
    { manifest, resource, message, background, onDismissMessage, onLoad },
    ref,
  ) {
    if (message) {
      return (
        <div className="grid h-full place-items-center p-8">
          <AppMessage
            message={message}
            onClose={onDismissMessage}
            className="max-w-lg"
          />
        </div>
      );
    }

    return (
      <iframe
        ref={ref}
        title={manifest?.title ?? "Leitor EPUB"}
        sandbox="allow-same-origin"
        srcDoc={buildReaderDocument(resource?.contents ?? "")}
        onLoad={onLoad}
        className="block h-full w-full overflow-hidden border-0"
        style={{ backgroundColor: background }}
      />
    );
  },
);
