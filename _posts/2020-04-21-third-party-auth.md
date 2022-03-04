---
layout:    post
title:     "第三方校验"
date:      2020-04-21 19:49:00 +0800
category:  "server"
tags:      ["third-party-auth", "oauth"]
excerpt:   "由于GFW以及API文档的语言，最近在对接海外的第三方平台的时候遇到了点麻烦。所以记录下这次google和facebook的对接案例，希望能给需要的人些许帮助。"
---

由于GFW以及API文档的语言，最近在对接海外的第三方平台的时候遇到了点麻烦。所以记录下这次google和facebook的对接案例，希望能给需要的人些许帮助。

## Facebook登陆校验

### 获取应用口令

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

### 校验凭据

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

google的登陆校验可以通过引入对应官方库来进行校验，比如nodejs就可以安装`google-auth-library`:

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

## Google支付校验

Google Play的订单支付操作起来有点麻烦，实在花了点时间才把整个流程跑通。在支付校验之前，我们需要先获取一些我们需要的参数。

### 获取授权码

首先我们需要在google后台的"API和服务"里面创建一个凭证，下载该凭证所属的相关信息和参数。根据生成凭证里面的信息，我们拼接出一个url地址，复制到浏览器中来获取我们需要的校验码 。

```http
GET https://accounts.google.com/o/oauth2/v2/auth?client_id={your_client_id}&response_type=code&scope=https://www.googleapis.com/auth/androidpublisher&redirect_uri={your_redirect_uri}&access_type=offline
```

访问这个地址之后，经过账号授权和一些列跳转，我们可以发现最后跳转到类似这种页面: `http://{your_redirect_uri}/?code=xxxxxxx&scope=https://www.googleapis.com/auth/androidpublisher`，跳转终点url参数里面code就是我们需要的校验码。

**注意事项：**

1. 一个client_id只能获取一次校验码，后面再请求会返回错误码，所以我们需要将这个校验码记下来。这个码虽然只用一次，但是是永久有效的。

2. 跳转地址可以设置成自己服务的地址，如果实在没有的话可以设置成`http://www.example.com/`。在创建凭证时，也需要填写跳转地址，因为后面获取校验码时，如果跳转地址不一致可能会导致返回错误码。

### 获取刷新令牌

我们拿到校验码之后，就可以请求google的oauth接口，获取我们想要的"刷新令牌"和"访问令牌"。

```http
POST https://www.googleapis.com/oauth2/v4/token

client_id: {your_client_id}
client_secret: {your_client_secret}
redirect_uri: {your_redirect_uri}
grant_type: "authorization_code"
code: {your_authorization_code}

>>
{
    "access_token":"xxxxx",
    "token_type":"Bearer",
    "expires_in":3600,
    "refresh_token":"xxxxx"
}
```

返回的结果里面，我们可以获取到刷新令牌 -- `refresh_token`和访问令牌 -- `access_token`。访问令牌可以用来校验订单，刷新令牌可以在访问令牌失效之后，再次获取新的访问令牌。

**注意事项：**

1. 一个校验码只能请求一次刷新令牌，后面再次请求会返回错误码，所以我们需要记下返回的`refresh_token`。当访问令牌失效时，我们就需要通过刷新令牌来重新获取新的访问令牌了。

2. 刷新令牌是长效令牌，可以看作是永久有效，需要保存下来；访问令牌是短效令牌，有效期一般只有3600秒，可以通过刷新令牌反复获取。

### 刷新访问令牌

上面的请求虽然可以获取到访问令牌，但是刷新令牌 -- `refresh_token`是唯一的，只能获取一次。当访问令牌失效之后，我们就需要通过刷新令牌来获取新的访问令牌。

````http
POST https://www.googleapis.com/oauth2/v4/token

client_id: {your_client_id}
client_secret: {your_client_secret}
redirect_uri: {your_redirect_uri}
grant_type: "refresh_token",
refresh_token: {your_refresh_token}

>> 
{
    "access_token":"xxxxx",
    "token_type":"Bearer",
    "expires_in":3600,
}
````

### 订单校验

终于到了校验订单这一步，前面的三个操作都是为了校验订单准备的。我们需要获得访问令牌、订阅商品名称、app包名、购买令牌，然后拼接请求地址来校验订阅。

```http
GET https://www.googleapis.com/androidpublisher/v3/applications/{your_package_name}/purchases/products/{your_product_id}/tokens/{your_purchase_token}?access_token={your_access_token}

>> 
{
    "kind": "androidpublisher#productPurchase",
    "purchaseTimeMillis": string (int64 format),
    "purchaseState": integer,
    "consumptionState": integer,
    "developerPayload": string,
    "orderId": string,
    "purchaseType": integer,
    "acknowledgementState": integer
}
```

返回结果里面的参数解释如下：

|  参数  |  类型  |  解释  |
|  :---  |  :---:  |  :---  |
| kind | String | androidpublisher服务中的inappPurchase对象 |
| purchaseTimeMillis| string (int64 format) | 购买产品的时间，自纪元（1970年1月1日）以来的毫秒数 |
| purchaseState | integer | 订单的购买状态; 0:购买 1:取消 2:挂起(待支付) |
| consumptionState | integer | inapp消费状态。0:未消费 1:已消费 |
| developerPayload | String | 开发人员指定的字符串，包含有关订单的补充信息 |
| orderId | string | 与购买inapp产品相关联的订单ID |
| purchaseType | integer | 购买inapp产品的类型。仅当未使用标准应用内结算流程进行此购买时，才会设置此字段。可能的值是：0. 测试（即从许可证测试帐户购买）1. 促销（即使用促销代码购买）2. 奖励（即观看视频广告而非付费） |
| acknowledgementState | integer | inapp产品的确认状态。0:待确认 1:已确认 |

订单校验流程：

1. 自己服务器生成订单

2. 向googlePlay初始化订单，玩家付款之后将服务器订单与google平台方的订单建立映射

3. 客户端确认消费订单，并且设置透传参数`developerPayload`，透传一般可以自由设置，通常拼接 *自己的订单id、商品id、价格* 等信息。

4. 服务器向google校验订单，根据返回结果校验购买状态`purchaseState`、透传参数`developerPayload`

**注意事项：**

1. 订单校验的url是拼接的

2. `your_package_name`是对应在平台设置的包名

3. `your_product_id`是对应在平台添加的商品id，需要与初始化订单时的商品id一致

4. `your_token`是玩家支付成功之后平台返回给客户端的订单token

5. `access_token`是上面操作获取到的访问口令。

### 错误码处理

当订单校验无法通过时，谷歌的api接口会返回类似下面的错误结构，我们可以根据返回的报错信息来做相应的调整。

```http
>>>
{
  "error": {
    "code": 401,
    "message": "Request xxxxxxx",
    "errors": [
      {
        "message": "xxxxx",
        "domain": "xxxx",
        "reason": "xxxx",
        "location": "xxx",
        "locationType": "xxx"
      }
    ],
    "status": "xxxx"
  }
}
```

google的api限制很多，我们需要调整好对应的设置。

在订单校验中还会碰到很多错误：

1. `Google Play Android Developer API has not been used in project xxx before or it is disabled`，这个错误是因为项目没有开启API权限，去后台[console](
https://console.developers.google.com/apis/api/androidpublisher.googleapis.com/overview)开启API权限即可。

2. `The project id used to call the Google Play Developer API has not been linked in the Google Play Developer Console`，这个错误是因为项目没有与API权限进行关联，去后台[console](https://play.google.com/apps/publish/)的“API权限”将项目和API进行关联即可。

3. `The current user has insufficient permissions to perform the requested operation`，这个错误是因为服务器使用的accessToken对应的账户没有对应的权限，去后台[console](https://play.google.com/apps/publish)的“用户与权限”添加下账号的“查看财务信息”权限。

为了避免google平台的API限制，最好在申请凭证之后，在google后台[console](https://console.developers.google.com/apis/credentials/domainverification)添加校验服务器对应网域。如果网域之前没有认证过，将平台生成的校验文件放置在网站根目录即可，待google平台自己抓取验证。

## Google订阅

### 订阅校验

订阅商品的校验和普通商品的校验类似，区别是校验地址和校验返回值有些许不同。我们需要获得访问令牌、订阅商品名称、app包名、购买令牌，然后拼接请求地址来校验订阅。

```http
GET https://www.googleapis.com/androidpublisher/v3/applications/{your_package_name}/purchases/subscriptions/{your_product_id}/tokens/{your_purchase_token}?access_token={your_access_token}

>> 
{
    "kind": "androidpublisher#subscriptionPurchase",
    "startTimeMillis": string (int64 format),
    "expiryTimeMillis": string (int64 format),
    "autoRenewing": boolean,
    "priceAmountMicros": string(int64 format),
    "paymentState": integer,
    "developerPayload": string,
    "cancelReason": integer,
    "orderId": string,
    "purchaseType": integer,
    "acknowledgementState": integer,
}
```

返回结果里面的参数解释如下：

|  参数  |  类型  |  解释  |
|  :---  |  :---:  |  :---  |
| kind | String | androidpublisher服务中的subscriptionPurchase对象 |
| startTimeMillis | string (int64 format) | 授予订阅的时间，自纪元（1970年1月1日）以来的毫秒数 |
| expiryTimeMillis | string (int64 format) | 订阅到期的时间，自纪元（1970年1月1日）以来的毫秒数 |
| autoRenewing | integer | 订阅在达到其当前到期时间时是否将自动续订 |
| priceAmountMicros | integer | 订阅价格，价格以微单位表示 |
| paymentState | integer | 订阅的付款状态; 0:待付款 1:收到付款 2:免费试用 3:待推迟的升级/降级。对于已取消、已过期的订阅不存在该字段 |
| developerPayload | String | 开发人员指定的字符串，包含有关订单的补充信息 |
| cancelReason | String | 订阅被取消或未自动更新的原因。0:用户取消 1:系统取消 2:新订阅替换旧订阅 3:开发人员取消了订阅 |
| orderId | string | 与购买inapp产品相关联的订单ID |
| purchaseType | integer | 购买inapp产品的类型。仅当未使用标准应用内结算流程进行此购买时，才会设置此字段。可能的值是：0. 测试（即从许可证测试帐户购买）1. 促销（即使用促销代码购买） |
| acknowledgementState | integer | 订阅产品的确认状态。0:待确认 1:已确认 |

订阅校验流程（和普通商品类似）：

1. 自己服务器生成订单

2. 向googlePlay初始化订单，玩家付款之后将服务器订单与google平台方的订单建立映射

3. 客户端确认消费订单，并且设置透传参数`developerPayload`，透传一般可以自由设置，通常拼接 *自己的订单id、商品id、价格* 等信息。

4. 服务器向google校验订单，根据返回结果校验付款状态`paymentState`、透传参数`developerPayload`，以及订阅的授权开始和到期时间。

5. 不同的订阅状态，对应校验信息中一些字段的不同值，可以参考谷歌文档 - [添加订阅专用功能
](https://developer.android.google.cn/google/play/billing/billing_subscriptions.html) 进行处理

6. 管理后续的订阅状态，例如暂停订阅、保留订阅、取消订阅、续费订阅等状态。具体细节在后面的 [Cloud Pub/Sub](/2020/04/21/third-party-auth/###Cloud%20Pub/Sub) 中讲述

**注意事项：**

1. 订单校验的url是拼接的

2. `your_package_name`是对应在平台设置的包名

3. `your_product_id`是对应在平台添加的商品id，需要与初始化订单时的商品id一致

4. `your_token`是玩家支付成功之后平台返回给客户端的订单token

5. `access_token`是上面操作获取到的访问口令。

### Cloud Pub/Sub

通过谷歌提供的rest接口，我们可以很轻松的校验新购买的订阅商品，当接口返回值中付款状态`paymentState`不为0，订阅到期的时间`expiryTimeMillis`大于当前时间戳，并且透传参数`developerPayload`符合我们的要求，即可认为是一个合法的订阅商品购买记录。

但是，订阅商品是有其特殊属性的。订阅商品一般只需要购买一次，如果在google play后台设置订阅商品的周期之后，订阅商品的有效期到达之后系统会自动续费，续费成功会刷新订阅的有效期；某些原因（取消订阅或者账户余额不够），订阅的有效期则不会刷新。在这种情况下，我们的商品只购买了一次，后续的自动续费时间点我们是无法获知的，所以也无法去主动校验，这时候我们就需要引入谷歌云的Pub/Sub服务。

服务开启步骤:

1. 访问[谷歌云](https://console.cloud.google.com/home/dashboard)后台，在左侧菜单选择 `Pub/Sub` 。

2. 点击 `创建主题` 按钮创建一个订阅主题, 只需要填写主题名称即可。

3. 点击 `创建订阅` 按钮创一个订阅，

    - 绑定之前创建好的主题

    - 选择传送类型 - 推送，填写自己搭建的服务器回调地址，"启用身份验证"(主要是在回调请求中会带一个jwt格式的签名)可以根据需要勾选或者不勾选

    - 根据需求，设置消息的保留时长、订阅到期时间、确认截至期限、订阅过滤条件、消息排序、死信、重试政策等配置

4. 访问[GooglePlay控制台](https://play.google.com/console/developers)，选择对应的app，在左侧菜单中选择 `获利设置`

5. 将之前在谷歌云创建的主题名称填入 `获利设置` 下的 `实时开发者通知`，然后保存更改。

6. 可以在 `获利设置` 下的 `实时开发者通知` 界面点击 `发送测试通知` 按钮来测试自己服务器回调地址是否能正常返回

服务回调处理:

```http
{
    "message": {
        "attributes": {
            "key": "value"
        },
        "data": "SGVsbG8gQ2xvdWQgUHViL1N1YiEgSGVyZSBpcyBteSBtZXNzYWdlIQ==",
        "messageId": "136969346945"
    },
   "subscription": "projects/myproject/subscriptions/mysubscription"
}
```

谷歌云 `Pub/Sub` 服务会通过post请求，向回调地址发起一次请求，请求格式是 `application/json`，需要端点服务器能解析该格式的请求。数据内容中， `subscription` 就是之前创建的订阅名称， `message` 是消息主体，我们一般只需要处理 `base64` 格式的 `message.data`内容。

````javascript
app.post('/pubsub/authenticated-push', jsonBodyParser, async (req, res) => {
  // 校验传递过来的token
  if (req.query.token !== PUBSUB_VERIFICATION_TOKEN) {
    res.status(400).send('Invalid request');
    return;
  }

  try {
    // 解析请求头中的jwt
    const bearer = req.header('Authorization');
    const [, token] = bearer.match(/Bearer (.*)/);
    tokens.push(token);

    // 校验jwt的合法性
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: 'example.com',
    });

    const claim = ticket.getPayload();
    claims.push(claim);
  } catch (e) {
    res.status(400).send('Invalid token');
    return;
  }

  // 解码base64格式的消息主体
  const message = Buffer.from(req.body.message.data, 'base64').toString(
    'utf-8'
  );

  messages.push(message);

  res.status(200).send();
});
````

对于订阅商品来说，我们可以从消息主体 `message.data` 中获取到 `订阅校验` 所需要的订阅商品名称(subscriptionId)、app包名(packageName)、购买令牌(purchaseToken)，除此之外还能获得订阅状态(notificationType)。利用这些信息，我们可以完成 `订阅校验` 来获取新的订阅信息，并保存在自己服务器上。

```json
{
    "version": "1.0",
    "packageName": "{your_package_name}",
    "eventTimeMillis": "1606731151744",
    "subscriptionNotification": {
        "version": "1.0",
        "notificationType": 2,
        "purchaseToken": "{your_purchase_token}",
        "subscriptionId": "{your_subscription_product}"
    }
}
```

**注意事项：**

1. 因为我们需要在玩家订阅发生变动的时候，谷歌能及时通知我们该变动，所以要将传送类型设置为推送

2. 谷歌云 `Pub/Sub` 中的发布与订阅，是针对这个服务的。该服务可以和谷歌的很多功能结合，其实相当于一个发布/订阅的消息队列。这里的订阅和GooglePlay中的订阅不要混淆，谷歌云的订阅是某个事物变动之后的消息，GooglePlay中的订阅只是一种商品。

3. 谷歌云 `Pub/Sub` 推送设置中需要填写回调地址，该回调地址只支持可公开访问的 `HTTPS` 地址，自己搭建的服务器必须具有由证书授权机构签署的有效 `SSL` 证书

4. 谷歌文档中虽然写着推送订阅的端点不需要网域验证，保险起见最好是在dns中加上一条TXT记录的网域验证。

5. `Pub/Sub` 服务只能将订阅商品的变动消息(订阅状态、购买令牌、商品id)传递到搭建的服务器，具体订阅信息的校验和获取还是需要之前提到的 `订阅校验` 接口

6. `启用身份验证` 其实只是在回调请求的头部带了一个jwt的签名，然后结合之前申请的访问令牌即可完成校验。因为回调处理之后，我们还需要 `订阅校验` ，在某些情况下为了简化回调处理其实可以取消 `启用身份验证`

---
来源:

[Facebook访问口令](https://developers.facebook.com/docs/facebook-login/access-tokens/#apptokens)

[Facebook调试和错误处理](https://developers.facebook.com/docs/facebook-login/access-tokens/debugging-and-error-handling)

[Google登陆校验](https://developers.google.com/identity/sign-in/android/backend-auth)

[Google支付校验](https://developers.google.cn/android-publisher/api-ref/purchases/products)

[Google订阅校验](https://developers.google.cn/android-publisher/api-ref/rest/v3/purchases.subscriptions)

[添加订阅专用功能](https://developer.android.google.cn/google/play/billing/billing_subscriptions.html)

[使用推送订阅](https://cloud.google.com/pubsub/docs/push)
