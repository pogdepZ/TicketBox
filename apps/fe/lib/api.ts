import { formatViTime } from "./format";

const localApiBaseUrl = "http://127.0.0.1:3001";
const configuredApiBaseUrl = (
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

export const API_BASE_URL =
  typeof window !== "undefined"
    ? "/api"
    : configuredApiBaseUrl || localApiBaseUrl;

if (
  typeof window === "undefined" &&
  process.env.NODE_ENV === "production" &&
  !configuredApiBaseUrl
) {
  console.warn(
    "API_BASE_URL is not configured. Server-side requests will fall back to local API URL.",
  );
}

export class ApiError extends Error {
  statusCode?: number;
  rawMessage?: string | string[];
  constructor(message: string | string[], statusCode?: number) {
    const displayMsg = Array.isArray(message)
      ? message.join(", ")
      : String(message);
    super(displayMsg);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.rawMessage = message;
  }
}

let refreshAccessTokenPromise: Promise<{
  token: string | null;
  status: "success" | "unauthorized" | "server_error";
}> | null = null;

async function refreshAccessToken(): Promise<{
  token: string | null;
  status: "success" | "unauthorized" | "server_error";
}> {
  if (typeof window === "undefined") {
    return { token: null, status: "server_error" };
  }

  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = (async (): Promise<{
      token: string | null;
      status: "success" | "unauthorized" | "server_error";
    }> => {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!refreshRes.ok) {
          // Nếu lỗi do hết hạn / không hợp lệ (401 hoặc 403), đánh dấu unauthorized
          if (refreshRes.status === 401 || refreshRes.status === 403) {
            return { token: null, status: "unauthorized" };
          }
          // Các lỗi khác như 500, 502, 504 là do server / kết nối tạm thời
          return { token: null, status: "server_error" };
        }

        const refreshJson = await refreshRes.json().catch(() => ({}));
        const newAccessToken = refreshJson?.data?.accessToken;

        if (typeof newAccessToken !== "string" || !newAccessToken) {
          return { token: null, status: "unauthorized" };
        }

        window.localStorage.setItem("access_token", newAccessToken);
        window.dispatchEvent(new CustomEvent("ticketbox-auth-change"));

        return { token: newAccessToken, status: "success" };
      } catch (refreshError) {
        console.error(
          "Silent token refresh failed due to network error:",
          refreshError,
        );
        return { token: null, status: "server_error" };
      }
    })().finally(() => {
      refreshAccessTokenPromise = null;
    });
  }

  return refreshAccessTokenPromise!;
}

function clearLocalAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("access_token");
  window.dispatchEvent(new CustomEvent("ticketbox-auth-change"));
  window.dispatchEvent(
    new CustomEvent("ticketbox-toast", {
      detail: {
        title: "Phiên làm việc hết hạn",
        message: "Vui lòng đăng nhập lại để tiếp tục sử dụng dịch vụ.",
        type: "error",
      },
    }),
  );
}

export function getFriendlyErrorMessage(error: any): string {
  const translateSingleMessage = (msg: string): string => {
    if (!msg || typeof msg !== "string") return "";
    const msgLower = msg.toLowerCase().trim();

    // 1. Authentication and authorization
    if (
      msgLower === "email already registered" ||
      msgLower === "email already exists" ||
      msgLower.includes("email_exists")
    ) {
      return "Email này đã được sử dụng. Vui lòng đăng ký bằng email khác.";
    }
    if (
      msgLower === "invalid email or password" ||
      msgLower === "invalid credentials" ||
      msgLower === "incorrect password"
    ) {
      return "Email hoặc mật khẩu không chính xác.";
    }
    if (
      msgLower === "refresh token is missing" ||
      msgLower === "invalid refresh token" ||
      msgLower === "unauthorized"
    ) {
      return "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.";
    }
    if (msgLower === "user is blocked") {
      return "Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ Admin.";
    }
    if (msgLower === "user is deleted") {
      return "Tài khoản của bạn đã bị xóa khỏi hệ thống.";
    }
    if (msgLower === "user is not active") {
      return "Tài khoản của bạn tạm thời chưa được kích hoạt.";
    }
    if (
      msgLower.includes("do not have permission") ||
      msgLower.includes("forbidden") ||
      msgLower === "forbidden resource"
    ) {
      return "Bạn không có quyền thực hiện chức năng này.";
    }

    // 2. Ticket purchasing / Seat Map
    if (msgLower.includes("concert not found")) {
      return "Sự kiện không tồn tại hoặc đã bị gỡ bỏ.";
    }
    if (msgLower.includes("ticket type not found")) {
      return "Không tìm thấy thông tin hạng vé yêu cầu.";
    }
    if (
      msgLower.includes("sold out") ||
      msgLower.includes("hết vé") ||
      msgLower.includes("sold_out")
    ) {
      return "Xin lỗi, loại vé này đã được bán hết.";
    }
    if (
      msgLower.includes("max_per_user") ||
      msgLower.includes("max per user") ||
      msgLower.includes("vượt quá số lượng") ||
      msgLower.includes("limit exceeded")
    ) {
      return "Bạn đã đạt giới hạn số lượng vé tối đa được phép mua cho mỗi tài khoản.";
    }
    if (
      msgLower.includes("expired") ||
      msgLower.includes("hết hạn") ||
      msgLower.includes("order expired") ||
      msgLower.includes("hold expired")
    ) {
      return "Đơn đặt vé hoặc phiên giữ ghế của bạn đã hết hạn. Vui lòng thao tác lại.";
    }
    if (msgLower.includes("seat")) {
      if (
        msgLower.includes("taken") ||
        msgLower.includes("booked") ||
        msgLower.includes("reserved") ||
        msgLower.includes("occupied") ||
        msgLower.includes("already")
      ) {
        return "Một hoặc nhiều ghế bạn chọn đã được đặt trước đó. Vui lòng chọn ghế khác.";
      }
    }

    // 3. AI Bio PDF Upload
    if (msgLower.includes("pdf file is required")) {
      return "Vui lòng chọn một tệp tài liệu PDF tải lên.";
    }
    if (msgLower.includes("only pdf files are supported")) {
      return "Hệ thống chỉ hỗ trợ xử lý tài liệu định dạng PDF.";
    }
    if (msgLower.includes("uploaded pdf is empty")) {
      return "Tệp PDF được tải lên trống, vui lòng kiểm tra lại.";
    }
    if (msgLower.includes("pdf file size must not exceed")) {
      return "Dung lượng tệp PDF tối đa được phép tải lên là 10MB.";
    }

    // 4. Admin operations
    if (msgLower.includes("only draft concerts can be published")) {
      return "Chỉ sự kiện đang ở trạng thái Nháp mới có thể xuất bản.";
    }
    if (msgLower.includes("completed concerts cannot be cancelled")) {
      return "Sự kiện đã kết thúc thì không thể hủy.";
    }
    if (msgLower.includes("only published concerts can be completed")) {
      return "Chỉ sự kiện đã xuất bản mới có thể chuyển sang trạng thái Hoàn thành.";
    }
    if (msgLower.includes("concert can only be completed after eventdate")) {
      return "Chỉ có thể kết thúc sự kiện sau khi thời gian diễn ra sự kiện kết thúc.";
    }
    if (msgLower.includes("eventdate must be a valid date")) {
      return "Thời gian diễn ra sự kiện không hợp lệ.";
    }
    if (msgLower.includes("eventdate must be greater than now")) {
      return "Thời gian diễn ra sự kiện phải ở tương lai.";
    }
    if (msgLower.includes("name is required")) {
      return "Vui lòng điền tên sự kiện.";
    }
    if (msgLower.includes("venuename is required")) {
      return "Vui lòng điền tên địa điểm tổ chức.";
    }
    if (msgLower.includes("venueaddress is required")) {
      return "Vui lòng điền địa chỉ tổ chức.";
    }

    // 4.5. Payment & Verification
    if (
      msgLower.includes("invalid vnpay signature") ||
      msgLower.includes("invalid signature")
    ) {
      return "Chữ ký xác thực thanh toán không hợp lệ.";
    }
    if (msgLower.includes("invalid momo signature")) {
      return "Chữ ký xác thực MoMo không hợp lệ.";
    }
    if (msgLower.includes("unknown payment provider")) {
      return "Cổng thanh toán không được hỗ trợ.";
    }
    if (
      msgLower.includes("order status is invalid") ||
      msgLower.includes("payment status is invalid")
    ) {
      return "Trạng thái đơn đặt vé không hợp lệ để thanh toán.";
    }

    // 5. Zod Validation (format: "fieldName: message")
    if (msg.includes(":")) {
      const idx = msg.indexOf(":");
      const fieldRaw = msg.substring(0, idx).trim();
      const detailRaw = msg
        .substring(idx + 1)
        .trim()
        .toLowerCase();

      const fieldsMap: Record<string, string> = {
        email: "Email",
        password: "Mật khẩu",
        fullname: "Họ và tên",
        name: "Tên",
        phone: "Số điện thoại",
        phonenumber: "Số điện thoại",
        username: "Tên đăng nhập",
        concertid: "Sự kiện",
        tickettypeid: "Hạng vé",
        seatnumbers: "Danh sách ghế",
        quantity: "Số lượng vé",
        paymentmethod: "Phương thức thanh toán",
        provider: "Kênh thanh toán",
      };

      const fieldFriendly = fieldsMap[fieldRaw.toLowerCase()] || fieldRaw;

      if (
        detailRaw.includes("invalid email") ||
        detailRaw.includes("email must be") ||
        detailRaw.includes("format")
      ) {
        return `${fieldFriendly} không hợp lệ hoặc không đúng định dạng.`;
      }
      if (
        detailRaw.includes("too small") ||
        detailRaw.includes("at least") ||
        detailRaw.includes("too short") ||
        detailRaw.includes("min") ||
        detailRaw.includes("must contain")
      ) {
        return `${fieldFriendly} không đạt độ dài tối thiểu yêu cầu.`;
      }
      if (
        detailRaw.includes("too large") ||
        detailRaw.includes("too long") ||
        detailRaw.includes("max")
      ) {
        return `${fieldFriendly} vượt quá độ dài tối đa cho phép.`;
      }
      if (
        detailRaw.includes("required") ||
        detailRaw.includes("empty") ||
        detailRaw.includes("must be") ||
        detailRaw.includes("invalid_type")
      ) {
        return `${fieldFriendly} không được bỏ trống.`;
      }
      if (
        detailRaw.includes("unique") ||
        detailRaw.includes("exists") ||
        detailRaw.includes("taken")
      ) {
        return `${fieldFriendly} đã tồn tại trong hệ thống.`;
      }

      return `${fieldFriendly}: ${msg.substring(idx + 1).trim()}`;
    }

    // 6. Generic system messages
    if (msgLower === "internal server error") {
      return "Hệ thống đang gặp sự cố. Vui lòng quay lại sau.";
    }

    return msg;
  };

  if (!error) return "Đã có lỗi xảy ra.";

  if (error instanceof ApiError) {
    const code = error.statusCode;
    const raw = error.rawMessage || error.message;
    const rawStr = String(Array.isArray(raw) ? raw[0] : raw).toLowerCase();

    if (rawStr.includes("cancelled or completed concerts cannot be updated")) {
      return "Không thể chỉnh sửa sự kiện đã hủy hoặc đã hoàn thành.";
    }
    if (rawStr.includes("cannot be updated after publish")) {
      return "Không thể thay đổi thông tin này sau khi sự kiện đã xuất bản (đang mở bán).";
    }

    // Direct status-code error formatting
    if (code === 429) {
      return "Yêu cầu quá nhanh. Vui lòng thử lại sau vài giây.";
    }
    if (code === 503) {
      return "Hệ thống đang bảo trì hoặc quá tải. Vui lòng thử lại sau.";
    }
    if (code === 403) {
      return "Bạn không có quyền thực hiện thao tác này.";
    }
    if (code === 404) {
      return "Thông tin yêu cầu không tồn tại.";
    }
    if (code === 401) {
      if (raw) {
        const checkMsg = (msg: string) => {
          const m = msg.toLowerCase().trim();
          return (
            m === "invalid email or password" ||
            m === "invalid credentials" ||
            m === "incorrect password"
          );
        };
        const hasInvalidCreds = Array.isArray(raw)
          ? raw.some(checkMsg)
          : checkMsg(String(raw));
        if (hasInvalidCreds) {
          return "Email hoặc mật khẩu không chính xác.";
        }

        const checkBlockedOrInactive = (msg: string) => {
          const m = msg.toLowerCase().trim();
          return (
            m === "user is blocked" ||
            m === "user is deleted" ||
            m === "user is not active"
          );
        };
        const hasBlockedOrInactive = Array.isArray(raw)
          ? raw.some(checkBlockedOrInactive)
          : checkBlockedOrInactive(String(raw));
        if (hasBlockedOrInactive) {
          if (Array.isArray(raw)) {
            return raw
              .map((r) => translateSingleMessage(r))
              .filter(Boolean)
              .join("\n");
          }
          return translateSingleMessage(String(raw));
        }
      }
      return "Phiên làm việc hết hạn. Vui lòng đăng nhập lại.";
    }

    if (Array.isArray(raw)) {
      return raw
        .map((r) => translateSingleMessage(r))
        .filter(Boolean)
        .join("\n");
    }
    return translateSingleMessage(String(raw));
  }

  if (error instanceof Error) {
    return translateSingleMessage(error.message);
  }

  if (typeof error === "string") {
    return translateSingleMessage(error);
  }

  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Try to get token from localStorage for client-side fetches
  let token = "";
  if (typeof window !== "undefined") {
    token = window.localStorage.getItem("access_token") || "";
  }

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (typeof window !== "undefined") {
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || "API Request failed";
    const statusCode = errorData.metadata?.statusCode || response.status;

    const canAttemptRefresh =
      statusCode === 401 &&
      typeof window !== "undefined" &&
      endpoint !== "/auth/refresh" &&
      endpoint !== "/auth/login" &&
      endpoint !== "/auth/register";

    if (canAttemptRefresh) {
      const oldToken = window.localStorage.getItem("access_token");
      if (oldToken) {
        const refreshResult = await refreshAccessToken();
        if (refreshResult.status === "success" && refreshResult.token) {
          const retryHeaders = new Headers(options.headers);
          if (
            !retryHeaders.has("Content-Type") &&
            !(options.body instanceof FormData)
          ) {
            retryHeaders.set("Content-Type", "application/json");
          }
          retryHeaders.set("Authorization", `Bearer ${refreshResult.token}`);

          if (typeof window !== "undefined") {
            retryHeaders.set(
              "Cache-Control",
              "no-cache, no-store, must-revalidate",
            );
            retryHeaders.set("Pragma", "no-cache");
            retryHeaders.set("Expires", "0");
          }

          const retryResponse = await fetch(url, {
            ...options,
            headers: retryHeaders,
            credentials: "include",
          });

          if (retryResponse.ok) {
            const retryJson = await retryResponse.json();
            return retryJson.data;
          }

          const retryErrorData = await retryResponse.json().catch(() => ({}));
          throw new ApiError(
            retryErrorData.message || "API Request failed after token refresh",
            retryErrorData.metadata?.statusCode || retryResponse.status,
          );
        }

        // Chỉ xóa session khi refresh token thực sự bị từ chối (hết hạn / không hợp lệ)
        if (refreshResult.status === "unauthorized") {
          clearLocalAuthSession();
        } else if (refreshResult.status === "server_error") {
          throw new ApiError(
            "Không thể kết nối đến máy chủ để gia hạn phiên làm việc. Vui lòng thử lại sau.",
            503
          );
        }
      }
    }

    throw new ApiError(message, statusCode);
  }

  // BE wrapper format: { statusCode, message, data, metadata }
  const json = await response.json();
  return json.data;
}

// ----------------------------------------------------
// CONCERTS
// ----------------------------------------------------

export async function getConcerts(params?: {
  status?: string;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, String(value));
        }
      });
    }

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const options = { cache: "no-store" as const };

    const data = await fetchApi(`/concerts${queryString}`, options);

    // data format: { items: [], meta: {} }
    return {
      items: data.items.map((concert: any) =>
        mapConcertToDisplay(concert, false),
      ),
      meta: data.meta,
    };
  } catch (error) {
    console.error("Backend API /concerts failed:", error);
    throw error;
  }
}

export async function createConcert(payload: any): Promise<any> {
  return await fetchApi("/concerts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadConcertSeatMapSvg(
  concertId: string,
  file: File,
): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  return await fetchApi(`/concerts/${concertId}/seat-map-svg`, {
    method: "POST",
    body: formData,
  });
}

export async function uploadConcertPoster(
  file: File,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  return await fetchApi("/concerts/upload-poster", {
    method: "POST",
    body: formData,
  });
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function getConcertById(id: string) {
  try {
    const url = `/concerts/${id}`;
    const options = { cache: "no-store" as const };

    const concert = await fetchApi(url, options);
    return mapConcertToDisplay(concert, false);
  } catch (error) {
    console.error(`Backend API /concerts/${id} failed:`, error);
    throw error;
  }
}

function mapLocalMockToBEConcert(mock: any) {
  return {
    id: mock.id,
    slug: mock.slug || slugify(mock.title || ""),
    name: mock.title,
    description: mock.description || "Tiểu sử nghệ sĩ và chi tiết show diễn.",
    artistName: mock.artist,
    venueName: mock.venue,
    venueAddress: mock.city,
    eventDate: new Date(mock.date).toISOString(),
    seatMapSvgUrl: null,
    posterUrl: mock.image,
    status: mock.status === "sold-out" ? "PUBLISHED" : "PUBLISHED",
    ticketsSold: mock.status === "sold-out" ? mock.capacity || 2000 : 0,
    capacity: mock.capacity || 2000,
    revenue: 0,
    genre: mock.genre || "Live Music",
    language: mock.language || "Tiếng Việt",
    ageLimit: mock.ageLimit || "Tất cả lứa tuổi",
    seatZones: [],
  };
}

const CONCERT_STATUS_LOCAL_KEY = "ticketbox-local-concert-statuses";

export function getLocalConcertStatus(concertId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(
      `${CONCERT_STATUS_LOCAL_KEY}-${concertId}`,
    );
  } catch {
    return null;
  }
}

export function saveLocalConcertStatus(concertId: string, status: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      `${CONCERT_STATUS_LOCAL_KEY}-${concertId}`,
      status,
    );
  }
}

export function clearLocalConcertStatus(concertId: string) {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(`${CONCERT_STATUS_LOCAL_KEY}-${concertId}`);
  }
}

function mapConcertToDisplay(concert: any, useLocalOverride = false) {
  // Normalize status to uppercase to resolve casing mismatches between FE and BE
  if (concert && typeof concert.status === "string") {
    concert.status = concert.status.toUpperCase();
  }

  // Override status from localStorage if mock fallback mode is active
  if (useLocalOverride) {
    const localStatus = getLocalConcertStatus(concert.id);
    if (localStatus) {
      concert = { ...concert, status: localStatus };
    }
  } else {
    // Clear the localStorage override once the backend API succeeds and loads the real status
    clearLocalConcertStatus(concert.id);
  }

  // Mapping BE model to what FE components expect based on mock data
  const ticketsSold = concert.ticketsSold ?? 0;
  const capacity = concert.capacity ?? 0;

  const isSoldOut = capacity > 0 && ticketsSold >= capacity;
  let statusDisplay = "Đang bán";

  if (concert.status === "DRAFT") statusDisplay = "Nháp";
  else if (concert.status === "CANCELLED") statusDisplay = "Đã hủy";
  else if (concert.status === "COMPLETED") statusDisplay = "Đã kết thúc";
  else if (isSoldOut) statusDisplay = "Hết vé";
  else if (capacity > 0 && capacity - ticketsSold <= capacity * 0.2)
    statusDisplay = "Sắp hết vé";

  return {
    id: concert.id,
    slug: concert.slug || slugify(concert.name || ""),
    title: concert.name,
    artist: concert.artistName || "Nhiều nghệ sĩ",
    date: concert.eventDate,
    time: formatViTime(concert.eventDate),
    venue: concert.venueName,
    city: concert.city || "",
    address: concert.venueAddress || "",
    image:
      concert.posterUrl ||
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&h=700&fit=crop",
    description: concert.description,
    price: (() => {
      if (concert.seatZones && concert.seatZones.length > 0) {
        const prices = concert.seatZones
          .flatMap(
            (zone: any) =>
              zone.ticketTypes?.map((t: any) => Number(t.price)) || [],
          )
          .filter((p: number) => p > 0);
        if (prices.length > 0) {
          return Math.min(...prices);
        }
      }
      return 450000;
    })(),
    capacity: capacity,
    soldOut: isSoldOut,
    genre: concert.type || concert.genre || "N/A",
    language: concert.language || "N/A",
    ageLimit: concert.ageLimit || "N/A",
    ticketsSold: ticketsSold,
    revenue: concert.revenue ?? 0,
    status: statusDisplay,
    seatMapSvgUrl: concert.seatMapSvgUrl || concert.seatMapSvg || null,
    rawStatus: concert.status,
    seatZones: concert.seatZones,
    artistBio: concert.artistBio,
    artistBioStatus: concert.artistBioStatus,
    guestList: concert.guestList || [],
    createdAt: concert.createdAt,
  };
}

// ----------------------------------------------------
// ORDERS
// ----------------------------------------------------

export async function createOrder(payload: any, idempotencyKey?: string) {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers["idempotency-key"] = idempotencyKey;
  }
  return await fetchApi("/orders", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

// ----------------------------------------------------
// PAYMENTS
// ----------------------------------------------------

export async function createPayment(
  payload: { orderId: string; provider: string; returnUrl?: string },
  idempotencyKey?: string,
) {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers["idempotency-key"] = idempotencyKey;
  }
  return await fetchApi("/payments/create", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

// ----------------------------------------------------
// AUTH
// ----------------------------------------------------

export async function login(payload: any) {
  const data = await fetchApi("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (data.accessToken) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("access_token", data.accessToken);
      window.dispatchEvent(new CustomEvent("ticketbox-auth-change"));
    }
  }
  return data;
}

export async function register(payload: any) {
  return await fetchApi("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getProfile() {
  return await fetchApi("/auth/profile");
}

export async function logout() {
  try {
    await fetchApi("/auth/logout", { method: "POST" });
  } catch (err) {
    console.warn("Logout API failed, continuing client logout", err);
  } finally {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("access_token");
      window.dispatchEvent(new CustomEvent("ticketbox-auth-change"));
    }
  }
}

// ----------------------------------------------------
// MOCKED SEATS & TICKET ZONES (Not in BE yet)
// ----------------------------------------------------

import type { TicketZone, TicketZoneStatus } from "./types";

export async function getTicketZonesAsync(
  concertId: string,
  preFetchedSeatZones?: any[],
): Promise<TicketZone[]> {
  try {
    let seatZones = preFetchedSeatZones;
    if (!seatZones) {
      const concert = await fetchApi(`/concerts/${concertId}`, {
        next: { revalidate: 60 },
      } as any);
      seatZones = concert.seatZones;
    }

    if (!seatZones || seatZones.length === 0) {
      const localTypes = getLocalTicketTypes(concertId);
      if (localTypes && localTypes.length > 0) {
        return localTypes.map((t, idx) => ({
          id: t.id,
          name: t.name,
          label: t.name,
          price: Number(t.price),
          remaining: t.remaining,
          total: t.totalQuantity,
          color: ["#ff3b30", "#ffcc00", "#34c759", "#007aff", "#af52de"][
            idx % 5
          ],
          description: "",
          status:
            t.remaining === 0
              ? "sold-out"
              : t.remaining / t.totalQuantity <= 0.15
                ? "limited"
                : "available",
          concertId,
          seatZoneId: t.id,
          ticketTypeId: t.id,
          code: ["svip", "vip", "premium", "standard", "economy"][idx % 5],
        }));
      }
      return [];
    }

    const processedZones = seatZones.flatMap((zone: any) => {
      const ticketType = zone.ticketTypes?.[0];
      if (!ticketType) return [];

      let status: TicketZoneStatus = "available";
      if (ticketType.status === "SOLD_OUT" || ticketType.remaining === 0)
        status = "sold-out";
      else if (ticketType.remaining / ticketType.totalQuantity <= 0.15)
        status = "limited";

      return [
        {
          id: zone.id, // Use database UUID to guarantee uniqueness
          name: zone.name,
          label: ticketType.name,
          price: Number(ticketType.price),
          remaining: ticketType.remaining,
          total: ticketType.totalQuantity,
          color: zone.color || "#cccccc",
          description: "",
          status,
          concertId,
          seatZoneId: zone.id,
          ticketTypeId: ticketType.id,
          code: (zone.code || "").toLowerCase(),
        },
      ];
    });

    const validCodes = ["svip", "vip", "premium", "standard", "economy"];

    // Sort all unique zones by price descending
    const sortedByPrice = [...processedZones].sort(
      (a, b) => b.price - a.price || a.name.localeCompare(b.name),
    );

    const N = sortedByPrice.length;
    let mappedCodes: string[] = [];
    if (N === 1) {
      mappedCodes = ["economy"];
    } else if (N === 2) {
      mappedCodes = ["vip", "economy"];
    } else if (N === 3) {
      mappedCodes = ["vip", "standard", "economy"];
    } else if (N === 4) {
      mappedCodes = ["vip", "premium", "standard", "economy"];
    } else {
      mappedCodes = ["svip", "vip", "premium", "standard", "economy"];
    }

    processedZones.forEach((zone) => {
      // Nếu zone đã có code từ database (khác rỗng), giữ nguyên hoàn toàn để khớp với Seatmap SVG
      if (zone.code && zone.code.trim() !== "") {
        return;
      }
      // Otherwise, assign visual code based on price ranking index
      const idx = sortedByPrice.findIndex((z) => z.id === zone.id);
      if (idx !== -1 && idx < mappedCodes.length) {
        zone.code = mappedCodes[idx];
      } else {
        zone.code = "economy";
      }
    });

    return processedZones;
  } catch (error) {
    console.error("Error fetching ticket zones:", error);
    throw error;
  }
}

export async function getSeatsAsync(
  concertId: string,
  preFetchedSeatZones?: any[],
) {
  try {
    let seatZones = preFetchedSeatZones;
    if (!seatZones) {
      const concert = await fetchApi(`/concerts/${concertId}`, {
        next: { revalidate: 60 },
      } as any);
      seatZones = concert.seatZones;
    }

    if (!seatZones || seatZones.length === 0) {
      return [];
    }

    // Fetch real-time reserved/held seats from backend
    let reservedSeats: any[] = [];
    try {
      reservedSeats = await fetchApi(`/concerts/${concertId}/reserved-seats`);
    } catch (e) {
      console.warn(
        "Failed to fetch real-time reserved seats, falling back to static allocation",
        e,
      );
    }

    const reservedMap = new Map<string, string>();
    if (Array.isArray(reservedSeats)) {
      reservedSeats.forEach((s: any) => {
        if (s && s.seatNumber) {
          reservedMap.set(s.seatNumber, s.status);
        }
      });
    }

    const seats: any[] = [];
    const localTypes = getLocalTicketTypes(concertId);

    seatZones.forEach((zone: any) => {
      let mockCode = (zone.code || "economy").toLowerCase();
      if (
        !["svip", "vip", "premium", "standard", "economy"].includes(mockCode)
      ) {
        mockCode = "economy";
      }

      const ticketType = zone.ticketTypes?.[0];
      const localType = localTypes?.find(
        (t) =>
          t.id === zone.id || t.name === zone.name || t.id === ticketType?.id,
      );
      const remaining = localType
        ? Number(localType.remaining)
        : ticketType
          ? Number(ticketType.remaining)
          : 0;
      const total = localType
        ? Number(localType.totalQuantity)
        : ticketType
          ? Number(ticketType.totalQuantity)
          : 48;

      // Determine seats per row dynamically to make a balanced grid
      let seatsPerRow = 12;
      if (total > 200) seatsPerRow = 20;
      else if (total > 100) seatsPerRow = 16;
      else seatsPerRow = 12;

      const numRows = Math.ceil(total / seatsPerRow);
      const rowNames = Array.from({ length: numRows }).map((_, idx) => {
        if (idx < 26) {
          return String.fromCharCode(65 + idx); // A, B, C, ...
        } else {
          return "A" + String.fromCharCode(65 + (idx - 26)); // AA, AB, AC, ...
        }
      });

      let availablePlaced = 0;
      let totalPlaced = 0;

      rowNames.forEach((row, rowIndex) => {
        for (let number = 1; number <= seatsPerRow; number++) {
          if (totalPlaced >= total) break;
          totalPlaced++;

          const seatLabel = `${row}${number.toString().padStart(2, "0")}`;
          let status: "disabled" | "sold" | "held" | "available" = "available";

          const dbStatus = reservedMap.get(seatLabel);
          if (dbStatus === "CONFIRMED") {
            status = "sold";
          } else if (dbStatus === "HELD") {
            status = "held";
          } else {
            // Fallback: allocate available status based on zone remaining count
            if (availablePlaced < remaining) {
              status = "available";
              availablePlaced++;
            } else {
              status = "sold";
            }
          }

          seats.push({
            id: `seat-${concertId}-${zone.id}-${row}-${number}`,
            row,
            number,
            label: seatLabel,
            status,
            zoneId: zone.id,
            concertId,
            seatZoneId: zone.id,
          });
        }
      });
    });

    return seats;
  } catch (error) {
    console.error("Error fetching seats:", error);
    throw error;
  }
}

// ----------------------------------------------------
// LOCAL STORAGE TICKET TYPES FALLBACK (For Admin CRUD)
// ----------------------------------------------------

const TICKET_TYPES_LOCAL_KEY = "ticketbox-local-ticket-types";

export function getLocalTicketTypes(concertId: string): any[] {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(
    `${TICKET_TYPES_LOCAL_KEY}-${concertId}`,
  );
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveLocalTicketTypes(concertId: string, types: any[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      `${TICKET_TYPES_LOCAL_KEY}-${concertId}`,
      JSON.stringify(types),
    );
  }
}

export async function createTicketType(concertId: string, payload: any) {
  try {
    return await fetchApi(`/concerts/${concertId}/ticket-types`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn(
      "Backend API /ticket-types not found, falling back to LocalStorage",
      err,
    );
    const mockTypes = getLocalTicketTypes(concertId);
    const newType = {
      id: `tickettype-${Date.now()}`,
      concertId,
      name: payload.name,
      price: Number(payload.price),
      totalQuantity: Number(payload.totalQuantity),
      remaining: Number(payload.totalQuantity),
      maxPerUser: Number(payload.maxPerUser || 4),
      status: "ACTIVE",
      saleStartAt: payload.saleStartAt || null,
      saleEndAt: payload.saleEndAt || null,
    };
    const updated = [...mockTypes, newType];
    saveLocalTicketTypes(concertId, updated);
    return newType;
  }
}

export async function updateTicketType(
  concertId: string,
  ticketTypeId: string,
  payload: any,
) {
  try {
    return await fetchApi(
      `/concerts/${concertId}/ticket-types/${ticketTypeId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  } catch (err) {
    console.warn(
      "Backend API /ticket-types not found, falling back to LocalStorage",
      err,
    );
    const mockTypes = getLocalTicketTypes(concertId);
    const updated = mockTypes.map((t: any) => {
      if (t.id === ticketTypeId) {
        return {
          ...t,
          name: payload.name,
          price: Number(payload.price),
          totalQuantity: Number(payload.totalQuantity),
          maxPerUser: Number(payload.maxPerUser || 4),
          saleStartAt: payload.saleStartAt || null,
          saleEndAt: payload.saleEndAt || null,
        };
      }
      return t;
    });
    saveLocalTicketTypes(concertId, updated);
    return { id: ticketTypeId, ...payload };
  }
}

export async function deleteTicketType(
  concertId: string,
  ticketTypeId: string,
) {
  try {
    return await fetchApi(
      `/concerts/${concertId}/ticket-types/${ticketTypeId}`,
      {
        method: "DELETE",
      },
    );
  } catch (err) {
    console.warn(
      "Backend API /ticket-types not found, falling back to LocalStorage",
      err,
    );
    const mockTypes = getLocalTicketTypes(concertId);
    const updated = mockTypes.filter((t: any) => t.id !== ticketTypeId);
    saveLocalTicketTypes(concertId, updated);
    return { success: true };
  }
}

// ----------------------------------------------------
// ORDERS & TICKETS (REAL/FALLBACK)
// ----------------------------------------------------

export async function getOrderById(orderId: string): Promise<any> {
  return await fetchApi(`/orders/${orderId}`);
}

export async function getUserOrders(): Promise<any[]> {
  return await fetchApi("/orders");
}

// ----------------------------------------------------
// REVENUE & DASHBOARD (REAL/FALLBACK)
// ----------------------------------------------------

export async function getRevenueSummary(): Promise<any> {
  return await fetchApi("/admin/revenue/summary");
}

export async function getConcertRevenue(concertId: string): Promise<any> {
  return await fetchApi(`/admin/concerts/${concertId}/revenue`);
}

export async function getDashboardAnalytics(): Promise<any> {
  return await fetchApi("/admin/dashboard/analytics");
}

export async function getGenreRevenueAnalytics(
  startDate: string,
  endDate: string,
): Promise<any> {
  try {
    return await fetchApi(
      `/admin/dashboard/genre-revenue?startDate=${startDate}&endDate=${endDate}`,
    );
  } catch (error) {
    console.error("Failed to fetch genre revenue analytics:", error);
    throw error;
  }
}

export async function getUserAnalyticsAdmin(
  startDate: string,
  endDate: string,
): Promise<any> {
  try {
    return await fetchApi(
      `/admin/users/analytics?startDate=${startDate}&endDate=${endDate}`,
    );
  } catch (error) {
    console.error("Failed to fetch user analytics:", error);
    throw error;
  }
}

export async function getDashboardRevenueAnalyticsAdmin(
  startDate: string,
  endDate: string,
): Promise<any> {
  try {
    return await fetchApi(
      `/admin/dashboard/revenue-analytics?startDate=${startDate}&endDate=${endDate}`,
    );
  } catch (error) {
    console.error("Failed to fetch dashboard revenue analytics:", error);
    throw error;
  }
}

export async function getUsersAdmin(
  page = 1,
  limit = 10,
  search = "",
): Promise<any> {
  try {
    let url = `/admin/users?page=${page}&limit=${limit}`;
    if (search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    return await fetchApi(url);
  } catch (error) {
    console.error("Failed to fetch users list:", error);
    throw error;
  }
}

export async function updateUserStatusAdmin(
  userId: string,
  status: string,
): Promise<any> {
  try {
    return await fetchApi(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    console.error(`Failed to update user ${userId} status:`, error);
    throw error;
  }
}

export async function updateUserRoleAdmin(
  userId: string,
  role: string,
): Promise<any> {
  try {
    return await fetchApi(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  } catch (error) {
    console.error(`Failed to update user ${userId} role:`, error);
    throw error;
  }
}

// ----------------------------------------------------
// AI BIO & PDF (REAL/FALLBACK)
// ----------------------------------------------------

const BIO_LOCAL_PREFIX = "ticketbox-local-bio-";
const BIO_STATUS_LOCAL_PREFIX = "ticketbox-local-bio-status-";

export async function uploadArtistBioPdf(
  concertId: string,
  file: File,
): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  const idempotencyKey =
    typeof window !== "undefined" && window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `bio-${concertId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return await fetchApi(`/admin/concerts/${concertId}/artist-bio/upload`, {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: formData,
  });
}

export async function getAiBioStatus(concertId: string): Promise<any> {
  const concert = await getConcertById(concertId);
  return {
    status: (concert.artistBioStatus || "empty").toUpperCase(),
    bio: concert.artistBio,
  };
}

export async function updateConcertBio(
  concertId: string,
  bio: string,
): Promise<any> {
  return await fetchApi(`/concerts/${concertId}`, {
    method: "PATCH",
    body: JSON.stringify({ artistBio: bio }),
  });
}

export async function importGuestList(
  concertId: string,
  file: File,
): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  return await fetchApi(`/admin/concerts/${concertId}/guest-list/import`, {
    method: "POST",
    body: formData,
  });
}

export async function cancelConcert(
  concertId: string,
  reason = "Hủy bởi quản trị viên",
): Promise<any> {
  return await fetchApi(`/concerts/${concertId}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export async function updateConcert(
  concertId: string,
  payload: any,
): Promise<any> {
  return await fetchApi(`/concerts/${concertId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function publishConcert(concertId: string): Promise<any> {
  return await fetchApi(`/concerts/${concertId}/publish`, {
    method: "PATCH",
  });
}

// Helper to parse current user from localStorage token
function getCurrentUserEmail(): string {
  if (typeof window === "undefined") return "guest";
  const token = window.localStorage.getItem("access_token");
  if (!token) return "guest";

  // Check if mock token (mock-access-token.${btoa(`${user.id}:${user.email}`)}.${Date.now()})
  if (token.startsWith("mock-access-token.")) {
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const decoded = atob(parts[1]); // e.g. "user.id:user.email"
        const email = decoded.split(":")[1];
        if (email) return email.toLowerCase().trim();
      }
    } catch (e) {
      console.warn("Failed to parse mock token:", e);
    }
  }

  // Check if standard JWT token (3 parts)
  const parts = token.split(".");
  if (parts.length === 3) {
    try {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      const payload = JSON.parse(jsonPayload);
      const email = payload.email || payload.sub || payload.id;
      if (email) return String(email).toLowerCase().trim();
    } catch (e) {
      console.warn("Failed to parse JWT token:", e);
    }
  }

  return "default";
}

function getNotificationsStorageKey(): string {
  const emailKey = getCurrentUserEmail().replace(/[^a-z0-9@._-]/g, "_");
  return `ticketbox-local-notifications-${emailKey}`;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

function getLocalNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  const key = getNotificationsStorageKey();
  const stored = window.localStorage.getItem(key);
  if (!stored) {
    const defaultNotifs: NotificationItem[] = [
      {
        id: "notif-1",
        title: "Chào mừng bạn đến với TicketBox",
        message:
          "Đăng ký tài khoản thành công! Khám phá các concert và săn vé ngay nhé.",
        read: false,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: "notif-2",
        title: "Thanh toán đơn hàng thành công",
        message:
          "Đơn hàng của bạn đã được ghi nhận. QR code e-ticket của bạn đã sẵn sàng.",
        read: true,
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
    ];
    window.localStorage.setItem(key, JSON.stringify(defaultNotifs));
    return defaultNotifs;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function getNotifications(): Promise<{
  items: NotificationItem[];
  unreadCount: number;
}> {
  return await fetchApi("/notifications");
}

export async function markNotificationRead(id: string): Promise<any> {
  return await fetchApi(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<any> {
  return await fetchApi("/notifications/read-all", { method: "POST" });
}

export function addLocalNotification(title: string, message: string) {
  if (typeof window === "undefined") return;
  const items = getLocalNotifications();
  const newItem: NotificationItem = {
    id: `notif-${Date.now()}`,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    getNotificationsStorageKey(),
    JSON.stringify([newItem, ...items]),
  );

  // Dispatch custom event to sync other components
  window.dispatchEvent(new CustomEvent("ticketbox-notification-change"));

  // Dispatch custom event to show Toast alert
  window.dispatchEvent(
    new CustomEvent("ticketbox-toast", {
      detail: { title, message, type: "success" },
    }),
  );
}

export async function getGuestList(concertId: string) {
  return await fetchApi(`/admin/concerts/${concertId}/guest-list`);
}
