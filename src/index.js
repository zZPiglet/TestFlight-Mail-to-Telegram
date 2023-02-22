import * as PostalMime from "postal-mime";
import { convert } from "html-to-text";

export default {
    async email(message, env, ctx) {
        if (env.FORWARD_TO_ADDRESS) {
            await message.forward(env.FORWARD_TO_ADDRESS);
        }
        let rawEmail = new Response(message.raw);
        let arrayBuffer = await rawEmail.arrayBuffer();
        let parser = new PostalMime.default();
        let email = await parser.parse(arrayBuffer);
        // Use email.text if it is a simple email.
        //let subject = message.headers.get("subject"); // The subject of the email, e.g xxx  for xx is now available to test.
        let html = email.html;
        html = html.replace(/=\n/g, "");
        html = html.replace(/=([0-9A-Fa-f]{2})/g, "%$1");
        let h1Elements = html.match(/<h1[^>]*>(.*?)<\/h1>/gis).join("\n");
        let h2Elements = html.match(/<h2[^>]*>(.*?)<\/h2>/gis).join("\n");
        let preElements = html.match(/<pre[^>]*>(.*?)<\/pre>/gis).join("\n");
        let h1Text = decodeURIComponent(
            convert(h1Elements, {
                selectors: [
                    {
                        selector: "h1",
                        format: "block",
                    },
                ],
            })
        ); // xxx is ready to test on xx
        let h2Text = decodeURIComponent(
            convert(h2Elements, {
                selectors: [
                    {
                        selector: "h2",
                        format: "block",
                    },
                ],
            })
        ); // What to Test:
        let changelog = decodeURIComponent(convert(preElements)); // TestFlight Changelog
        let token = env.TG_BOT_TOKEN;
        let ids = env.TG_SEND_IDS.split(",");
        let text = `${h1Text}\n\n${h2Text}\n\n${changelog}`;
        // xxx is the app name
        //if (h1Text.includes("xxx")) {
            let promiseArr = ids.map(
                async (id) =>
                    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: "POST",
                        body: `chat_id=${id}&text=${encodeURIComponent(text)}`,
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                    })
            );
            await Promise.all(promiseArr);
        //}
    },
};
