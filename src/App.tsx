import { useEffect, useState } from "react";
import "./App.css";

const title = "YouTube transcriber";
const base = "/whisper-web/";
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
        <a href={url} className="which">
          [{url}]
        </a>
      </p>
      <Indicator status={status} />
      <Transcription lines={chunks.flat()} />
    </>
  );
};

const About = () => (
  <>
    <h2>FAQ</h2>
    <div className="about">
      <h3>What is this?</h3>
      <p>
        Hi! This is a webapp that you can use to transcribe YouTube videos. The
        links at the top let you navigate back to the homepage, on which you can
        input a link to a YouTube video, then click the "transcribe" button.
      </p>
      <h3>Does my data go anywhere?</h3>
      <p>
        The transcription does not happen in your browser; rather, when you
        click the "transcribe" button, your browser sends the YouTube video ID
        you chose to an{" "}
        <a href="https://aws.amazon.com/lambda/">AWS Lambda function</a>, which
        then downloads the video, transcribes it, and streams its status and
        transcription results to an{" "}
        <a href="https://aws.amazon.com/s3/">AWS S3 bucket</a>. Your browser
        then polls this S3 bucket and displays the results to you.
      </p>
      <h3>How long is the data kept?</h3>
      <p>
        The S3 bucket{" "}
        <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html">
          expires
        </a>{" "}
        objects after one day; then S3 usually deletes those expired objects
        within another day or so.
      </p>
      <h3>How does the transcription work?</h3>
      <p>
        All the source code for this webapp (both client and server) are
        available <a href={github}>on GitHub</a>. The server uses{" "}
        <a href="https://openai.com/blog/whisper/">OpenAI's Whisper model</a> to
        do the heavy lifting. The model is available in several sizes, from
        "tiny" to "large"; this particular webapp uses the "small" model.
      </p>
    </div>
  </>
);

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

const InvalidYoutubeURL = (props: { value: string | null }) => (
  <Invalid name="YouTube ID or URL" value={props.value} />
);

const isSessionValid = (session: string | null) =>
  session?.match(/^[0-9a-f]{16}$/);
const isYoutubeValid = (session: string | null) =>
  session?.match(/^[\-0-9A-Z_a-z]{11}$/);

const parseYoutube = (youtube: string) => {
  const m = youtube.match(/^https:\/\/youtu\.be\/([\-0-9A-Z_a-z]{11})$/);
  if (m) return m[1];
  try {
    return new URL(youtube).searchParams.get("v");
  } catch (e) {
    return youtube;
  }
};

const Homepage = (props: { transcribe: (youtube: string) => void }) => {
  const [attempt, setAttempt] = useState<string | undefined>(undefined);
  return (
    <>
      <p>Enter a YouTube video ID or URL:</p>
      <div>
        <input id="textbox"></input>
      </div>
      <div>
        <button
          onClick={() => {
            const youtube = (
              document.getElementById("textbox") as HTMLInputElement
            ).value;
            const parsed = parseYoutube(youtube);
            if (!isYoutubeValid(parsed)) setAttempt(youtube);
            else props.transcribe(parsed!);
          }}
          className="transcribe"
        >
          transcribe
        </button>
      </div>
      {attempt !== undefined ? <InvalidYoutubeURL value={attempt} /> : <></>}
    </>
  );
};

const App = () => {
  const params = new URL(window.location.href).searchParams;
  const [about] = useState(params.get("about"));
  const [session, setSession] = useState(params.get("session"));
  const [youtube, setYoutube] = useState(params.get("youtube"));

  useEffect(() => {
    document.title = youtube === null ? title : `${title}: ${youtube}`;
  });

  return (
    <>
      <h1>
        <a href={base}>{title}</a>
      </h1>
      <p>
        <a href={github}>GitHub</a> | <a href={base}>home</a> |{" "}
        <a href={`${base}?about`}>about</a>
      </p>
      {about !== null ? (
        <About />
      ) : session === null && youtube === null ? (
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
