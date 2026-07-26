# JPEG Generation Download Design

## Goal

Download every successfully generated interior as a `.jpg` file while keeping
the existing WebP storage format unchanged.

## Behavior

- The existing authenticated endpoint
  `/api/v1/generations/[id]/download` remains the download URL.
- The endpoint continues to verify that the generation belongs to the current
  user, succeeded, is not deleted, and has a user-visible result.
- The stored result is downloaded from private Supabase Storage.
- Sharp decodes the stored image, applies EXIF rotation, converts it to sRGB,
  flattens transparency onto a white background, and encodes JPEG at quality
  92.
- The response uses `Content-Type: image/jpeg`.
- The attachment filename is
  `interior-design-YYYY-MM-DD.jpg`.
- Existing and future WebP results follow the same download behavior.
- Stored media records and Storage objects are not rewritten or duplicated.

## Error Handling

- Missing or unauthorized generations keep the existing 404/401 behavior.
- Storage download failures keep the existing 502 behavior.
- Decode or JPEG conversion failures return the existing
  `DOWNLOAD_FAILED` response with HTTP 500.
- The response remains private and non-cacheable.

## Testing

Extract JPEG conversion into a focused server helper and test it with a small
in-memory image. The test must verify:

- JPEG magic bytes `FF D8 FF`.
- Sharp reports format `jpeg`.
- Alpha is removed.
- The requested dimensions are preserved.

Route-level static verification must confirm the `.jpg` filename and
`image/jpeg` response header. The complete test, type-check, lint, and
production build suites must pass before completion.

## Acceptance Criteria

- Clicking any existing “Скачать” action downloads a valid JPEG.
- The browser-visible filename ends in `.jpg`.
- JPEG quality is 92.
- No additional Storage object is created.
