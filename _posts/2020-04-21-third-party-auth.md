---
layout:    post
title:     "第三方服务端校验"
date:      2020-04-21 19:49:00 +0800
category:  "server"
tags:      ["third-party-auth", "oauth"]
excerpt:   "由于GFW以及API文档的语言，最近在对接海外的第三方平台的时候遇到了点麻烦。所以记录下这次google和facebook的对接案例。"
---

由于GFW以及API文档的语言，最近在对接海外的第三方平台的时候遇到了点麻烦。所以记录下这次google和facebook的对接案例。


## Facebook登陆校验

### 获取应用口令 -- access_token

服务端向facebook请求时，需要带上应用口令access_token。应用口令的获取方式:

```HTTP
GET "https://graph.facebook.com/oauth/access_token?client_id={your-app-id}&client_secret={your-app-secret}&grant_type=client_credentials"

>> 
{
    "access_token": "{session-info-access-token}",
    "token_type": "bearer"
}
```

同时还有一种方法，可以不请求API生成应用口令，直接将APP_ID和APP_SECRET拼接:

```bash
access_token={APP_ID}|{APP_SECRET}
```

### 校验凭据 -- token

当我们拿到客户端获取的用户令牌 -- input_token之后，通过请求facebook服务端可以校验用户令牌的合法性（例如令牌的有效期、用户的权限等）:

```HTTP
GET https://graph.facebook.com/debug_token?input_token={input-token}&access_token={access_token}

>>
{

    "error": {
		"code": 190,
		"message": "You cannot access the app till you log in to www.facebook.com and follow the instructions given.",
		"subcode": 459
	}
}

>>
{
    "data": {
		"app_id": "{APP_ID}",
		"type": "USER",
		"application": "{APP_NAME}",
		"data_access_expires_at": 1595230436,
		"expires_at": 1592638436,
		"is_valid": true,
		"issued_at": 1587454436,
		"metadata": {
			"auth_type": "rerequest",
			"sso": "android"
		},
		"scopes": ["public_profile"],
		"user_id": "{user_id}"
	}
}
```

当获得请求响应之后，我们需要先判断是否有error信息。确认获取到用户信息之后，我们只需要判断`is_valid`字段是否为`true`，`user_id`字段是否和用户id一致，`app_id`字段是否一致。用户令牌的有效期可以不需要校验，如果在有效期之外接口不会返回用户信息。

**注意事项:** 校验用户令牌时，请求参数必须要带access_token，否则没法访问该接口，API会返回400的http状态码。


## Google登陆校验

google的登陆校验可以通过引入对应官方库来进行校验，比如nodejs就可以通过安装`google-auth-library`:


```javascript
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);
async function verify() {
  const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const userid = payload['sub'];
}
verify().catch(console.error);
```

如果不想引入官方的库，还可以自己通过请求API来简单校验:

```HTTP
GET/POST "https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"

>> 
{
    "error": "invalid_token",
    "error_description": "Invalid Value"
}

>>
{
    "iss": "https://accounts.google.com",
    "sub": "{user_id}",
    "azp": "{authorized_party}",
    "aud": "{APP_ID}",
    "iat": "1433978353",
    "exp": "1433981953",
}
```

当获得请求响应之后，我们需要先判断是否有error信息。确认获取到用户信息之后，我们还需要判断`aud`字段是否和APP_ID一致，`sub`字段是否和用户id一致。

## Google Play支付校验