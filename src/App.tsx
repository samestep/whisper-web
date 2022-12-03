import { useEffect, useState } from "react";
import "./App.css";

const title = "YouTube transcriber";
const github = "https://github.com/samestep/whisper-web";

interface Starting {
  status: "starting";
}

interface Progress {
  downloadedBytes?: number;
  totalBytes?: number | null;
  totalBytesEstimate?: number | null;
  elapsed: number;
  secondsRemaining?: number | null;
  bytesPerSecond?: number | null;
}

interface Downloading {
  status: "downloading";
  progress: Progress;
}

interface Transcribing {
  status: "transcribing" | "finished";
  chunks: number;
}

interface Meta {
  awsRequestId: string;
}

type Status = Starting | (Meta & (Downloading | Transcribing));

const Indicator = (props: { status: Status }) => {
  switch (props.status.status) {
    case "starting": {
      return <p>starting...</p>;
    }
    case "downloading": {
      const { downloadedBytes, totalBytes, secondsRemaining } =
        props.status.progress;
      const progress = [];
      if (
        downloadedBytes !== undefined &&
        totalBytes !== undefined &&
        totalBytes !== null
      ) {
        if (downloadedBytes === totalBytes)
          return <p>downloaded! transcribing...</p>;
        progress.push(
          `${Math.round((downloadedBytes / totalBytes) * 100)}% done`
        );
      }
      if (secondsRemaining !== undefined && secondsRemaining !== null)
        progress.push(`${secondsRemaining} seconds remaining`);
      return <p>downloading... {progress.join(", ")}</p>;
    }
    case "transcribing": {
      return <p>transcribing...</p>;
    }
    case "finished": {
      return <p>finished!</p>;
    }
  }
};

const Transcription = (props: { lines: string[] }) => (
  <table className="results">
    <tbody>
      {props.lines.map((line, i) => {
        const m = line.match(
          /^\[(\d\d:\d\d\.\d\d\d) --> (\d\d:\d\d\.\d\d\d)\] (.*)$/
        );
        if (m) {
          const [, start, , text] = m;
          return (
            <tr key={i}>
              <td className="timestamp">{start}</td>
              <td className="transcription">{text}</td>
            </tr>
          );
        }
      })}
    </tbody>
  </table>
);

const numChunks = (status: Status) =>
  status.status === "transcribing" || status.status === "finished"
    ? status.chunks
    : 0;

const Session = (props: { session: string; youtube: string }) => {
  const [status, setStatus] = useState<Status>({ status: "starting" });
  const [chunks, setChunks] = useState<string[][]>([]);

  useEffect(() => {
    if (status.status === "finished") return;
    const interval = setInterval(async () => {
      const response = await fetch(
        `https://whisper-web.s3.us-east-2.amazonaws.com/youtube/${props.youtube}/${props.session}/status.json`
      );
      if (!response.ok) return;
      const newStatus = await response.json();
      setStatus((status) => {
        if (numChunks(newStatus) > 0) {
          for (let i = numChunks(status); i < newStatus.chunks; ++i) {
            fetch(
              `https://whisper-web.s3.us-east-2.amazonaws.com/youtube/${props.youtube}/${props.session}/${i}.json`
            ).then(async (response) => {
              const chunk = await response.json();
              setChunks((chunks) => {
                const newChunks = [...chunks];
                newChunks[i] = chunk;
                return newChunks;
              });
            });
          }
        }
        return newStatus;
      });
    }, 1000); // milliseconds
    return () => {
      clearInterval(interval);
    };
  }, [props.session, props.youtube, status.status === "finished"]);

  const url = `https://youtu.be/${props.youtube}`;
  return (
    <>
      <p>
        <a href={url}>{url}</a>
      </p>
      <Indicator status={status} />
      <Transcription lines={chunks.flat()} />
    </>
  );
};

const Invalid = (props: { name: string; value: string | null }) => (
  <p className="invalid">
    invalid {props.name}: {JSON.stringify(props.value)}
  </p>
);

const InvalidSession = (props: { value: string | null }) => (
  <Invalid name="session" value={props.value} />
);

const InvalidYoutube = (props: { value: string | null }) => (
  <Invalid name="YouTube ID" value={props.value} />
);

const isSessionValid = (session: string | null) =>
  session?.match(/[0-9a-f]{16}/);
const isYoutubeValid = (session: string | null) =>
  session?.match(/[\-0-9A-Z_a-z]{11}/);

const Homepage = (props: { transcribe: (youtube: string) => void }) => {
  const [attempt, setAttempt] = useState<string | undefined>(undefined);
  return (
    <>
      <p>Enter a YouTube video ID:</p>
      <div>
        <input id="textbox"></input>
      </div>
      <div>
        <button
          onClick={() => {
            const youtube = (
              document.getElementById("textbox") as HTMLInputElement
            ).value;
            if (!isYoutubeValid(youtube)) setAttempt(youtube);
            else props.transcribe(youtube);
          }}
        >
          transcribe
        </button>
      </div>
      {attempt !== undefined ? <InvalidYoutube value={attempt} /> : <></>}
    </>
  );
};

const App = () => {
  const params = new URL(window.location.href).searchParams;
  const [session, setSession] = useState(params.get("session"));
  const [youtube, setYoutube] = useState(params.get("youtube"));

  useEffect(() => {
    document.title = youtube === null ? title : `${title}: ${youtube}`;
  });

  return (
    <>
      <h1>
        <a href="/whisper-web/">{title}</a>
      </h1>
      <p>
        <a href={github}>{github}</a>
      </p>
      {session === null && youtube === null ? (
        <Homepage
          transcribe={(newYoutube) => {
            const chars = [];
            const radix = 16;
            for (let i = 0; i < 16; ++i)
              chars.push(Math.floor(Math.random() * radix).toString(radix));
            const newSession = chars.join("");

            const withParams = (s: string) => {
              const url = new URL(s);
              url.searchParams.set("session", newSession);
              url.searchParams.set("youtube", newYoutube);
              return url;
            };

            window.history.pushState(
              null,
              "",
              withParams(window.location.href).href
            );

            fetch(
              withParams(
                "https://okqcvtykhqywnehiwtwnbnh43i0xjvmi.lambda-url.us-east-2.on.aws/"
              )
            );

            setSession(newSession);
            setYoutube(newYoutube);
          }}
        />
      ) : isSessionValid(session) && isYoutubeValid(youtube) ? (
        <Session session={session!} youtube={youtube!} />
      ) : (
        <>
          {isSessionValid(session) ? <></> : <InvalidSession value={session} />}
          {isYoutubeValid(youtube) ? <></> : <InvalidYoutube value={youtube} />}
        </>
      )}
    </>
  );
};

export default App;
