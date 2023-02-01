# TestFlight Mail to Telegram

使用 Cloudflare Email Workers 将 TestFlight 邮件转发至 Telegram。

# 用法

首先

```sh
git clone https://github.com/zZPiglet/TestFlight-Mail-to-Telegram.git

cd TestFlight-Mail-to-Telegram

wrangler init .
```

配置好后安装依赖包：

```sh
npm install postal-mime html-to-text
```

在 `wrangler.toml` 中配置 `TG_SEND_IDS`，可同时发送给多个对象，使用 `,` 分开，不加密方便在 Cloudflare Dashboard 中直接更改。

再加密上传 `TG_BOT_TOKEN`：

```sh
wrangler secret put TG_BOT_TOKEN
```

（可选）加密上传 `FORWARD_TO_ADDRESS`，如配置则邮件依旧会转发至配置的地址，不配置则处理后直接丢弃：

```sh
wrangler secret put FORWARD_TO_ADDRESS
```

最后

```sh
wrangler publish
```

再去 Cloudflare Dashboard 中配置邮件路由，将需要处理的地址修改为发送至 Worker。

# 注意事项

1. 由于 Cloudflare Email Workers 内存和 CPU 时间限制，如果直接使用 `postal-mime` 解析出的 `email.text` 处理 TestFlight 邮件会直接被 Cloudflare 拒绝并返回邮件提示 `521 5.3.0 Upstream error`，并在 Dashboard 中提示 `failed to call worker`。所以这里使用 `email.html` 再通过 `html-to-text` 来处理（也可使用正则等直接处理），对于普通信息，使用 `email.text` 足矣，不必再引入 `html-to-text`。

2. 对于发送至 Telegram，并没有做任何错误处理（如消息过长、网络错误等），请尽量填写 `FORWARD_TO_ADDRESS` 以免漏信息或自行修改。
