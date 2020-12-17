---
layout:    post
title:     "关于加密的一些问题"
date:      2020-12-17 20:00:00 +0800
category:  "crypto"
tags:      ["crypto", "json"]
excerpt:   "对接第三方平台是最痛苦的事情之一，大厂的对接文档一般比较详细且准确，不过需要从海量的文档中找到自己想要的答案；小厂的对接文档缺失，系统兼容性烂，会让人白白浪费时间和精力。"
---

对接第三方平台是最痛苦的事情之一，大厂的对接文档一般比较详细且准确，不过需要从海量的文档中找到自己想要的答案；小厂的对接文档缺失，系统兼容性烂，会让人白白浪费时间和精力。


## DES-ECB加密

先来看一个不是太坑的加密，平台方文档上写着"Base64编码的 `DES-ECB` 加密"，下面我们使用 `nodejs` 实现 `DES-ECB` 的加/解密方法:

````js
const crypto = require('crypto');

// 编码
function des_ecb_encode(text, secretKey) {
    const key = Buffer.from(secretKey, "base64");
    const cipher = crypto.createCipheriv('des-ecb', key);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('utf8');

    return decrypted;
}

// 解码
function des_ecb_decode(encryptedBase64, secretKey) {
    const key = Buffer.from(secretKey, "base64");
    const decipher = crypto.createDecipheriv('des-ecb', key);

    let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
````

看起来上面的实现很简单是吧？只要根据Nodejs的官方文档，就可以很轻松的写出相应的代码。但是测试下来会发现，这样加解密得到的数据和平台方的不一致。仔细看文档，会发现文档里面还有一行小字"填充方式: `PKCS5Padding` "。什么意思呢？对于 `AES` 或者 `DES` 这类对称加密算法，要求明文需要按照一定长度对齐，也就是说会将原本的明文数据按照一定的长度进行切分，每个数据块长度都是相同的块大小。那么对于任意长度的明文字符，切分之后最后一个数据块长度可能是不满足要求的，这时候就需要对最后一个数据块进行填充。常见的填充标准有三种:

- ZeroPadding: 数据长度不满足时使用\0(也就是null)填充

- PKCS7Padding: 假设每个区块大小为blockSize

    + 已对齐: 填充一个长度为blockSize且每个字节均为blockSize的数据。

    + 未对齐: 需要补充的字节个数为n，则填充一个长度为n且每个字节均为n的数据。

- PKCS5Padding: PKCS7Padding的子集，只是块大小固定为8字节

因为nodejs的 `crypto` 库中，如果不显式设置填充量，nodejs默认不会填充:

````js
const crypto = require('crypto');

// 编码
function des_ecb_encode(text, secretKey) {
    const key = Buffer.from(secretKey, "base64");
    // 填充量
    const iv = Buffer.alloc(8); // 等同于 const iv = "0000000000000000";
    const cipher = crypto.createCipheriv('des-ecb', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('utf8');

    return decrypted;
}

// 解码
function des_ecb_decode(encryptedBase64, secretKey) {
    const key = Buffer.from(secretKey, "base64");
    // 填充量
    const iv = Buffer.alloc(8); // 等同于 const iv = "0000000000000000";
    const decipher = crypto.createDecipheriv('des-ecb', key, iv);

    let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
````

## OPENSSL_ALGO_SHA1

另一个平台，对数据签名时采用了 `OPENSSL_ALGO_SHA1` 算法，得到的签名已经base64编码。看到 `OPENSSL_ALGO_SHA1` 一时间有点懵，不知道是什么hash算法。经过谷歌搜索之后，发现是php语言中 `openssl_sign` 和 `openssl_verify` 函数使用的默认算法， `OPENSSL_ALGO_SHA1` 对应的是openssl下的 `RSA-SHA1` 算法。

先来看一下php实现:

````php
<?php

$privateKey = file_get_contents('./id_rsa');
$publicKey = file_get_contents('./id_rsa.pub');

function genSign($data, $privateKey) {
    openssl_sign($data, $sign, $privateKey, OPENSSL_ALGO_SHA1);

    return base64_encode($sign);
}

function verifySign($data, $sign, $publicKey) {
    $sign = base64_decode($sign);

    return openssl_verify($data, $sign, $publicKey, OPENSSL_ALGO_SHA1);
}
````

然后使用nodejs实现:

````js
"use strict";

const fs = require('fs');
const crypto = require('crypto');
const privateKey = fs.readFileSync('./id_rsa').toString();
const publicKey = fs.readFileSync('./id_rsa.pub').toString();


function genSign(data, privateKey) {
    const signer = crypto.createSign('RSA-SHA1');
    signer.update(data);
    signer.end();

    return signer.sign(privateKey, 'base64');
}

function verifySign(data, sign, publicKey) {
    const verify = crypto.createVerify('RSA-SHA1');
    verify.update(data);
    verify.end();

    return verify.verify(publicKey, sign, 'base64');
}
````

为什么要用php实现一遍呢，因为在测试时上面写的nodejs代码校验一直没法通过。为了测试签名算法正确性，就写了两个测试用例，分别在php和nodejs中输入相同的字符，然后比较签名后的字符。然后出现了一个奇怪的事情，当输入普通的英文时，两者输出的签名值一致。当输入中混有特殊字符或者中文时，两者输出结果竟然不一致。这时候考虑到可能时nodejs在签名时，对编码的处理可能有问题，将输入值指定为php默认编码 - utf8后，输出结果终于完全一致了：

````js
"use strict";

const fs = require('fs');
const crypto = require('crypto');
const privateKey = fs.readFileSync('./id_rsa').toString();
const publicKey = fs.readFileSync('./id_rsa.pub').toString();


function genSign(data, privateKey) {
    const signer = crypto.createSign('RSA-SHA1');
    signer.update(data, 'utf8');

    return signer.sign(privateKey, 'base64');
}

function verifySign(data, sign, publicKey) {
    const verify = crypto.createVerify('RSA-SHA1');
    verify.update(data, 'utf8');

    return verify.verify(publicKey, sign, 'base64');
}
````

真正荒诞的事情来了，当我在项目环境中使用以上代码后，发现nodejs下计算的签名值仍然和平台传递过来的不一致，真实让人头大。测试用例中结果一样，为什么到了实际环境中就不一致了呢？在项目中我们获得的是来自平台的一个json字符串，其中含有 `data` 和 `signature` , `signature` 是通过签名算法对 `data` 进行计算后得到的。因为签名算法是对字符进行处理，我们得到的 `data` 其实是一个object对象，所以在对整个json字符串解码之后取得 `data` ,然后再进行了一次json编码。那会不会是php和js两种语言对json处理不一样呢？


````php
<?php

$data = array(
    "id" => 1,
    "url" => "https://test.com"
);

echo json_encode($data);
// {"id":1,"url":"https:\/\/test.com"}
````

````js
"use strict";

const data = {
    id: 1,
    url: "https://test.com"
};

console.log(JSON.stringify(data));
// {"id":1,"url":"https://test.com"}
````

从上面的例子，能很明显的看出两种语言对于斜杠的处理。那现在我们就很容易处理两者的差异了。

如果想php环境下得到和js一致的结果，只需要在编码时设置一个忽略斜杠转义选项:

````php
<?php

$data = array(
    "id" => 1,
    "url" => "https://test.com"
);

echo json_encode($data, JSON_UNESCAPED_SLASHES);
// {"id":1,"url":"https://test.com"}
````

很显然对接第三方渠道，我们不太可能让对方修改json的处理。那只能在自己项目里面特殊处理一下，手动增加对斜杠的转义，最后经过处理的签名果然一致了:

````js
"use strict";

const data = {
    id: 1,
    url: "https://test.com"
};

const str = JSON.stringify(data, function (key, value) {
    if ( typeof value == "string") value.replace(/\//g, "\\/");

    return value;
});
// 或者 const str = JSON.stringify(data).replace(/\//g, '\\/');
// {"id":1,"url":"https:\/\/test.com"}
````

"坑爹的疯狂!" --- 斯拉克