import React from "react";

type Props = {
  participant: { full_name: string };
  likes?: string[];
  dislikes?: string[];
};

export default function ParticipantHandbook(props: Props) {
  return (
    <html>
      <head><meta charSet="utf-8" /><title>Participant Handbook</title></head>
      <body style={{ fontFamily: "Arial, sans-serif", padding: 24 }}>
        <h1>Participant Handbook</h1>
        <p>Participant: {props.participant.full_name}</p>
        <h2>Likes & Dislikes</h2>
        <p>Likes: {(props.likes || []).join(", ")}</p>
        <p>Dislikes: {(props.dislikes || []).join(", ")}</p>
      </body>
    </html>
  );
}
