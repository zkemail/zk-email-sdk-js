/**
 * d= / s= of DKIM-Signature header fields.
 *
 * REASON: the previous helpers took the first line containing "DKIM-Signature" (which also
 * matches X-Google-DKIM-Signature) or only the first signature, and matched /d=…/ anywhere in
 * the value. A message often carries several signatures (e.g. the sending service's and the
 * author domain's), and the one of interest isn't necessarily first. These parse each field's
 * tag list (RFC 6376 3.2: folding whitespace inside tag values is not part of the value) and
 * return every signature, in header order.
 */
export interface DkimSignatureDomainSelector {
  domain: string;
  selector: string;
}

/** Tags of one DKIM-Signature field value ("v=1; a=rsa-sha256; d=example.com; s=sel; ..."). */
export function parseDkimSignatureValue(value: string): DkimSignatureDomainSelector | null {
  const tags = new Map<string, string>();
  for (const part of value.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    tags.set(part.slice(0, eq).trim().toLowerCase(), part.slice(eq + 1).replace(/\s+/g, ""));
  }
  const domain = tags.get("d")?.toLowerCase();
  const selector = tags.get("s");
  return domain && selector ? { domain, selector } : null;
}

/** d=/s= of every DKIM-Signature field in a raw email (headers are unfolded first). */
export function dkimSignaturesFromEml(emlContent: string): DkimSignatureDomainSelector[] {
  const headerEnd = emlContent.search(/\r?\n\r?\n/);
  const headers = (headerEnd >= 0 ? emlContent.slice(0, headerEnd) : emlContent).replace(
    /\r?\n(?=[ \t])/g,
    ""
  );
  const out: DkimSignatureDomainSelector[] = [];
  for (const line of headers.split(/\r?\n/)) {
    const m = /^dkim-signature[ \t]*:(.*)$/i.exec(line);
    const sig = m && parseDkimSignatureValue(m[1]);
    if (sig) out.push(sig);
  }
  return out;
}

/** d=/s= of every DKIM-Signature value in a header map (header names compared case-insensitively). */
export function dkimSignaturesFromHeaderMap(
  headers: { entries(): Iterable<[string, string[]]> } | undefined
): DkimSignatureDomainSelector[] {
  const out: DkimSignatureDomainSelector[] = [];
  for (const [name, values] of headers?.entries() ?? []) {
    if (name.trim().toLowerCase() !== "dkim-signature") continue;
    for (const v of values ?? []) {
      const sig = parseDkimSignatureValue(v);
      if (sig) out.push(sig);
    }
  }
  return out;
}
