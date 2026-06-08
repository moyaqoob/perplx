import * as cheerio from "cheerio"

export async function scrapeUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PerplxBot/1.0; +https://perplx.ai)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    })
    clearTimeout(timeout)

    if (!res.ok) return null

    const html = await res.text()
    const $ = cheerio.load(html)

    $("script, style, nav, header, footer, iframe, noscript").remove()

    const mainContent =
      $("article").text() ||
      $('[role="main"]').text() ||
      $("main").text() ||
      $("body").text()

    const text = mainContent
      .replace(/\s+/g, " ")
      .replace(/\n+/g, "\n")
      .trim()

    return text.slice(0, 8000)
  } catch {
    return null
  }
}
