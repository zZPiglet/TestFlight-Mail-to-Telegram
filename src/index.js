import * as PostalMime from "postal-mime";
import { convert } from "html-to-text";

// https://github.com/mathiasbynens/quoted-printable
function quotedPrintableDecode(input) {
    return input
        .replace(/[\t\x20]$/gm, "")
        .replace(/=(?:\r\n?|\n|$)/g, "")
        .replace(/=([a-fA-F0-9]{2})/g, function ($0, $1) {
            var codePoint = parseInt($1, 16);
            return String.fromCharCode(codePoint);
        });
}

// https://www.php.net/manual/en/function.utf8-decode.php
function utf8Decode(str_data) {
    var tmp_arr = [],
        i = 0,
        ac = 0,
        c1 = 0,
        c2 = 0,
        c3 = 0,
        c4 = 0;
    str_data += "";
    while (i < str_data.length) {
        c1 = str_data.charCodeAt(i);
        if (c1 <= 191) {
            tmp_arr[ac++] = String.fromCharCode(c1);
            i++;
        } else if (c1 <= 223) {
            c2 = str_data.charCodeAt(i + 1);
            tmp_arr[ac++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            i += 2;
        } else if (c1 <= 239) {
            // http://en.wikipedia.org/wiki/UTF-8#Codepage_layout
            c2 = str_data.charCodeAt(i + 1);
            c3 = str_data.charCodeAt(i + 2);
            tmp_arr[ac++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        } else {
            c2 = str_data.charCodeAt(i + 1);
            c3 = str_data.charCodeAt(i + 2);
            c4 = str_data.charCodeAt(i + 3);
            c1 = ((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63);
            c1 -= 0x10000;
            tmp_arr[ac++] = String.fromCharCode(0xd800 | ((c1 >> 10) & 0x3ff));
            tmp_arr[ac++] = String.fromCharCode(0xdc00 | (c1 & 0x3ff));
            i += 4;
        }
    }

    return tmp_arr.join("");
}

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
        let h1Elements = html.match(/<h1[^>]*>(.*?)<\/h1>/gis).join("\n");
        let h2Elements = html.match(/<h2[^>]*>(.*?)<\/h2>/gis).join("\n");
        let preElements = html.match(/<pre[^>]*>(.*?)<\/pre>/gis).join("\n");
        let h1Text = utf8Decode(
            quotedPrintableDecode(
                convert(h1Elements, {
                    selectors: [
                        {
                            selector: "h1",
                            format: "block",
                        },
                    ],
                })
            )
        ); // xxx is ready to test on xx
        let h2Text = utf8Decode(
            quotedPrintableDecode(
                convert(h2Elements, {
                    selectors: [
                        {
                            selector: "h2",
                            format: "block",
                        },
                    ],
                })
            )
        ); // What to Test:
        let changelog = utf8Decode(quotedPrintableDecode(convert(preElements))); // TestFlight Changelog
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
