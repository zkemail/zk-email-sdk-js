import { DecomposedRegex, testDecomposedRegex } from "./src";

async function testEmail() {
  // Wait for wasm to initialize
  await new Promise((r) => setTimeout(r, 300));

  const decomposedRegex: DecomposedRegex = {
    name: "Hello Pattern",
    maxLength: 4000,
    location: "body",
    parts: [
      {
        isPublic: false,
        regexDef: "Hello ",
      },
      {
        isPublic: true,
        regexDef: "[^,]+",
      },
      {
        isPublic: false,
        regexDef: "!",
      },
    ],
  };
  const result = testDecomposedRegex(getEml(), decomposedRegex, false);
  console.log("result private field not revealed: ", result);
  const result2 = testDecomposedRegex(getEml(), decomposedRegex, true);
  console.log("result private fields revealed: ", result2);
}

testEmail();

function getEml() {
  return `Delivered-To: dimitridumonet@gmail.com
  Received: by 2002:a05:6214:4253:b0:6c3:6081:347f with SMTP id ne19csp173367qvb;
          Wed, 23 Oct 2024 00:53:01 -0700 (PDT)
  X-Forwarded-Encrypted: i=2; AJvYcCVVh7WWMz5AxaWec8h7XtAA1bveU3/Xz8F7la88bSsBCnETUG2ajh5kSpoJQm17/2YeEJwJc5NUsPoANBmIzQ==@gmail.com
  X-Received: by 2002:a05:6512:691:b0:539:ea7a:7691 with SMTP id 2adb3069b0e04-53b1a354a30mr652060e87.47.1729669981077;
          Wed, 23 Oct 2024 00:53:01 -0700 (PDT)
  ARC-Seal: i=1; a=rsa-sha256; t=1729669981; cv=none;
          d=google.com; s=arc-20240605;
          b=H+Xdh37PloNI2vl8aDESoHyYLqqgYOsoy5Ju2Y02jGuv6L/0LX/+5yJNiWwax/EZNB
           NEZby3RJ7bZljfg0Sr8mndej0zj5pmUqSNxM3umE2DrwLhzEfTfaaZcZIm7BnsAUHOeO
           fyjX9MCOKGt6dSwdRRSn6eTvjBuGFY6VUhV08q/tM8ilr3NbFzqDShanjcBNrfJPmJ2o
           rwJcGICeMFpkxThH+ZI4bR7R5CWZ20Gb95J2bXbL6AFSs0ywZ6lnLGUbVeURXNEJM6CY
           MRYn7O3uWZEl4G3dPQHttvXH7+iGDbAf0GBCoS+nvy6nZGWy/xpUJyWq7dNRmCUJ+HU2
           Z5oA==
  ARC-Message-Signature: i=1; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-20240605;
          h=to:subject:message-id:date:from:mime-version:dkim-signature;
          bh=Fo5d+d9xb+YHiWhsYyQpRCq3vLn0d45ZsTpIy6dMSpQ=;
          fh=eLZmymON9dYDqr5llJ10kkYGZvJRGSG3AX5vSya9PCw=;
          b=cRFnYq9vC9wgEqN6xPufuaecxuax/nMWD8sAhkc8wZED33MtfQMpz/la6GsrqBAp/6
           R5gA95c6rAo6RkQ6jPW7BSHR4K6gVTZeN73t75UMKhDjixcfgYD5vyt9eKj/SsDyrnKT
           znS+uTYU+oZtlm6WXBs4yIw9z+okzjxRPCNM8CJZn+vvlvX7xfEPmZ1LlcNjx8Cof/NL
           KTqsXarxZAXXlNJlBPG+tSdScQH3LWjrMCLGyAbXVSUbt0/Bc0lnnftIRJxPf8EMnWbH
           R5DkinZBaEsHLDC6xJVnRyZgX4pYZ3fB/XwSMmu+6A5J0xIiji/NznnMIAyepI2KFgCs
           jHTA==;
          dara=google.com
  ARC-Authentication-Results: i=1; mx.google.com;
         dkim=pass header.i=@gmail.com header.s=20230601 header.b=JBUDXuB1;
         spf=pass (google.com: domain of dimi.zktest@gmail.com designates 209.85.220.41 as permitted sender) smtp.mailfrom=dimi.zktest@gmail.com;
         dmarc=pass (p=NONE sp=QUARANTINE dis=NONE) header.from=gmail.com;
         dara=pass header.i=@gmail.com
  Return-Path: <dimi.zktest@gmail.com>
  Received: from mail-sor-f41.google.com (mail-sor-f41.google.com. [209.85.220.41])
          by mx.google.com with SMTPS id 2adb3069b0e04-53b13f85bf3sor1031666e87.21.2024.10.23.00.53.00
          for <dimitridumonet@gmail.com>
          (Google Transport Security);
          Wed, 23 Oct 2024 00:53:01 -0700 (PDT)
  Received-SPF: pass (google.com: domain of dimi.zktest@gmail.com designates 209.85.220.41 as permitted sender) client-ip=209.85.220.41;
  Authentication-Results: mx.google.com;
         dkim=pass header.i=@gmail.com header.s=20230601 header.b=JBUDXuB1;
         spf=pass (google.com: domain of dimi.zktest@gmail.com designates 209.85.220.41 as permitted sender) smtp.mailfrom=dimi.zktest@gmail.com;
         dmarc=pass (p=NONE sp=QUARANTINE dis=NONE) header.from=gmail.com;
         dara=pass header.i=@gmail.com
  DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
          d=gmail.com; s=20230601; t=1729669980; x=1730274780; dara=google.com;
          h=to:subject:message-id:date:from:mime-version:from:to:cc:subject
           :date:message-id:reply-to;
          bh=Fo5d+d9xb+YHiWhsYyQpRCq3vLn0d45ZsTpIy6dMSpQ=;
          b=JBUDXuB1VJXyjxFBb7bFU3j2+ioQ2yfX4jxgCYVCvGTIshpesAi9C+12c5wClqGNtr
           mbrAKEaciY1uqDyrQ3jdJUyDoGSh0ixDb2BrwGbHLuoVCUct47XQf0ExdagcoF3iay+k
           CaP4J2oVQt4EBgPr1lo6xYfB8KPPwa3J/FYtMCmcqHUty+shg9CvFbtN/KBLcIlC0syp
           JzuuvCuvGcfHz9mleAVMQY+5Qc7lC8xrkKHHjKyZ+n+YbONvEnXYl3a/KpMLS/tuDs5b
           JR5BF3gnC5q9yCY+/ocaHXb7E1ANprque0IPU5NdxS/sYD7jwm4x5f2LfBR8ry/3cwZG
           BwVA==
  X-Google-DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
          d=1e100.net; s=20230601; t=1729669980; x=1730274780;
          h=to:subject:message-id:date:from:mime-version:x-gm-message-state
           :from:to:cc:subject:date:message-id:reply-to;
          bh=Fo5d+d9xb+YHiWhsYyQpRCq3vLn0d45ZsTpIy6dMSpQ=;
          b=Tzg6F4aq6rbdwfY9S5Kq4nf87iWVGEZcGHi8PzFticv5g+8zOgSbH5ue/01MEjBVxR
           QUyArARd+vHXjpkYt3VItjOg55nPGR0cqyx0gX7KCtWRH/T8O5xxGRNgOmJHu/fdPOyN
           gmqhEYfVqqAgbebcfsnW5c17ocU5lWT84/3vU8+ZO2REvd/Z23prO7PPxRc1fPimlda4
           n0Qkpmn0r2aPqd/vwz718cycXbhgSl67i6SiUmPj2pfSGZaMbKS9On6iUWTE8WQVCx6L
           6PM9pdfiEv1oc/h6lpP31jm+rxyJfkQZHoRMe53YriSwdgqCVDFsoaAfuZYYhW5y82FQ
           XSFA==
  X-Gm-Message-State: AOJu0Yx42CZc66yAK8cMVMmoXJsw4UakG5bTGOrxiALLhDjRIk38B6ap 9lDsFoYdxdYnAM5lE8yf4tgR/hWLyKL6c6k3L8KSI4KtGYg/ZtQFfa+2PT+Gt7UbaqmUvXVpwb+ zO30mqpDalyjmRnlWCK7MTY+IcTU45A==
  X-Google-Smtp-Source: AGHT+IHp31HpdQWhw2iAK5whoT6O5HhaV2s2pUBpPW+aTMsbetZlQchj5B06ERHiQIPUt3new3XMeQGq0MyfHJqQUA0=
  X-Received: by 2002:a05:6512:2354:b0:539:e317:b05f with SMTP id 2adb3069b0e04-53b1a3119f9mr712750e87.28.1729669980209; Wed, 23 Oct 2024 00:53:00 -0700 (PDT)
  MIME-Version: 1.0
  From: Dimitri <dimi.zktest@gmail.com>
  Date: Wed, 23 Oct 2024 14:52:49 +0700
  Message-ID: <CAAG2-GgVtd5y8vBVrPxhB6mY+8rgkqFNU4tJoDzRSjqB1YQ3ZQ@mail.gmail.com>
  Subject: Hi!
  To: dimitridumonet@googlemail.com
  Content-Type: multipart/alternative; boundary="000000000000bfd5330625202cf1"

  --000000000000bfd5330625202cf1
  Content-Type: text/plain; charset="UTF-8"

  Hello ZK Email!

  Best,
  Dimitri

  --000000000000bfd5330625202cf1
  Content-Type: text/html; charset="UTF-8"

  <div dir="ltr">Hello ZK Email!<br><br>Best,<br>Dimitri</div>

  --000000000000bfd5330625202cf1--`;
}