import { createHmac } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { sameSecret } from "@/lib/secrets";

// GitHub's release webhook (deploy/README.md). When the deploy workflow publishes
// a release, this asks the server to check GitHub now rather than at its next
// 5-minute check: mblog-deploy.path sees DEPLOY_REQUEST_FILE change and starts the
// root-owned deploy script, which looks up the Latest release on GitHub itself.
// The commit written here only tells it to wait a little if Latest hasn't caught
// up yet, so whoever calls this can't choose what runs. All they can do is make
// the server look early.
export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const requestFile = process.env.DEPLOY_REQUEST_FILE;
  if (!secret || !requestFile) return new Response(null, { status: 404 });

  // GitHub signs the body as sent, so check those exact bytes before parsing them.
  const body = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  if (!sameSecret(signature, expected)) {
    console.info("Rejected a GitHub webhook with a bad signature");
    return Response.json({ error: "Bad signature" }, { status: 401 });
  }

  // Only a release being published triggers a check. GitHub also sends "created"
  // a few seconds before it, and a check started by that could still be running
  // when "published" arrives: systemd drops a trigger that lands mid-run. Other
  // changes to which release is Latest (a deletion, an edit) wait for the timer.
  const event = request.headers.get("x-github-event");
  const { action, release } = JSON.parse(body.toString("utf8")) as {
    action?: string;
    release?: { tag_name?: string };
  };
  if (event !== "release" || (action !== "published" && action !== "released")) {
    return Response.json({ ignored: action ? `${event}.${action}` : event });
  }

  const commit = /^deploy-([0-9a-f]{40})$/.exec(release?.tag_name ?? "")?.[1];
  await writeFile(requestFile, `${commit ?? ""}\n`);
  console.info(`Deploy check requested${commit ? ` for ${commit.slice(0, 7)}` : ""}`);
  return Response.json({ requested: true }, { status: 202 });
}
