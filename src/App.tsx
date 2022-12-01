import { useEffect, useState } from "react";
import "./App.css";

const title = "Whisper Web";
const github = "https://github.com/samestep/whisper-web";

const Session = (props: { session: string; youtube: string }) => {
  const url = `https://youtu.be/${props.youtube}`;
  return (
    <>
      <p>
        <a href={url}>{url}</a>
      </p>
      <p>transcribing...</p>
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
        <a href="/">{title}</a>
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

            const url = new URL(window.location.href);
            url.searchParams.set("session", newSession);
            url.searchParams.set("youtube", newYoutube);

            window.history.pushState(null, "", url.href);

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
