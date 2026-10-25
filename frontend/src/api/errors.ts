export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'PLAN_LIMIT'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'GONE'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNPROCESSABLE'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'BAD_GATEWAY'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_ERROR'

type ErrorBody = { error?: { code?: string; message?: string; details?: unknown } }

/** Every failed backend call becomes one of these. See docs/API.md for what each code means. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly details?: unknown

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  static from(status: number, body: unknown): ApiError {
    const err = (body as ErrorBody | undefined)?.error
    return new ApiError(
      status,
      (err?.code as ErrorCode | undefined) ?? 'INTERNAL_ERROR',
      err?.message ?? `HTTP ${status}`,
      err?.details,
    )
  }
}

const PLAN_NAMES: Record<string, string> = { basic: 'Basic', premium: 'Premium' }

/** A sentence in Bahasa Indonesia to show in a toast. Pass anything caught from `unwrap`. */
export function toUserMessage(err: unknown): string {
  if (!(err instanceof ApiError))
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet.'
  switch (err.code) {
    case 'VALIDATION_ERROR':
      return 'Periksa kembali isian yang ditandai.'
    case 'UNAUTHORIZED':
      return err.message === 'Wrong email or password'
        ? 'Email atau password salah.'
        : 'Sesi berakhir. Silakan masuk lagi.'
    case 'PLAN_LIMIT': {
      const required = (err.details as { required_plan?: string } | undefined)?.required_plan
      return required
        ? `Fitur ini butuh paket ${PLAN_NAMES[required] ?? required}.`
        : 'Batas paket undangan ini sudah tercapai.'
    }
    case 'FORBIDDEN':
      return 'Kamu tidak punya akses ke data ini.'
    case 'NOT_FOUND':
      return 'Data tidak ditemukan.'
    case 'CONFLICT':
      return 'Data ini sudah dipakai. Coba nilai lain.'
    case 'GONE':
      return 'Masa aktif undangan ini sudah berakhir.'
    case 'PAYLOAD_TOO_LARGE':
      return 'Ukuran file terlalu besar.'
    case 'UNPROCESSABLE':
      return 'Data wajib belum lengkap.'
    case 'TOO_MANY_REQUESTS':
      return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'
    case 'BAD_GATEWAY':
      return 'Layanan pembayaran sedang bermasalah. Coba lagi nanti.'
    case 'SERVICE_UNAVAILABLE':
      return 'Layanan ini belum dikonfigurasi di server.'
    default:
      return 'Terjadi kesalahan di server. Coba lagi.'
  }
}

/**
 * Field errors from a `VALIDATION_ERROR`, keyed by path (`"email"`, `"events.0.venue"`).
 * Feed it to vee-validate's `setErrors` to show them under each input.
 */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || err.code !== 'VALIDATION_ERROR') return {}
  const details = Array.isArray(err.details)
    ? (err.details as { path?: string; message?: string }[])
    : []
  return Object.fromEntries(
    details.filter((d) => d.path && d.message).map((d) => [d.path as string, d.message as string]),
  )
}
