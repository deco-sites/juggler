import { allowCorsFor } from "deco/mod.ts";
import { createClient } from "https://esm.sh/@clickhouse/client-web@1.2.0";
import { AppContext } from "site/apps/site.ts";

/**
 * Represents an event.
 */
interface Event {
  hostname: string;
  site_id: string | number;
  site_name: string;
  user_id?: string; // server side
  session_id?: string; // server side
  event_name: string;
  start_time: string;
  timestamp?: string; // server side
  pathname: string;
  navigation_from: string;
  entry_meta: {
    key: string[];
    value: string[];
  };
  utm_medium?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer: string;
  referrer_source?: string;
  ip_city?: string; // server side
  ip_continent?: string; // server side
  ip_country?: string; // server side
  ip_region?: string; // server side
  ip_region_code?: string; // server side
  ip_timezone?: string; // server side
  ip_lat?: string; // server side
  ip_long?: string; // server side
  screen_size: string;
  device: string;
  operating_system: string;
  operating_system_version: string;
  browser: string;
  browser_version: string;
}


const CLICKHOUSE_ADDRESS = Deno.env.get("CLICKHOUSE_ADDRESS");
const CLICKHOUSE_PASSWORD = Deno.env.get("CLICKHOUSE_PASSWORD");

if (!CLICKHOUSE_ADDRESS || !CLICKHOUSE_PASSWORD) {
  console.warn(
    "ClickHouse environment variables are not defined. ClickHouse functionality is now limited."
  );
}

/**
 * Sends an event to the event tracker.
 * @param event - The event to be sent.
 * @param _req - The request object (unused in this function).
 * @returns A promise that resolves to an object with the status of the operation or an error message.
 */
async function sendEvent({ event }: { event: Event }, req: Request, ctx: AppContext) {

  Object.entries(allowCorsFor(req)).map(([name, value]) => {
    ctx.response.headers.set(name, value);
  });

  const table = "event_tracker";
  const client = createClient({
    url: ctx.clickhouseAddress,
    username: ctx.clickhouseUsername,
    password: ctx.clickhousePassword.get()!,
  });

  const completeEvent = {
    ...event,
    timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
    ip_city: req.headers.get("cf-ipcity"),
    ip_continent: req.headers.get("cf-ipcontinent"),
    ip_country: req.headers.get("cf-ipcountry"),
    ip_region: req.headers.get("cf-region"),
    ip_region_code: req.headers.get("cf-region-code"),
    ip_timezone: req.headers.get("cf-timezone"),
    ip_lat: req.headers.get("cf-iplatitude"),
    ip_long: req.headers.get("cf-iplongitude"),
  }

  try {
    await client.insert({
      table,
      values: [completeEvent],
      format: "JSONEachRow",
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 1,
      },
    });

    return {
      status: "success",
    };
  } catch (error) {
    console.error(error);
    return {
      error: error.message,
    };
  }
}

export default sendEvent;
