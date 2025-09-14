# Personal Money Manager

This project is a Next.js application for tracking personal finances.

## Transactions API

The transaction endpoints support optional query parameters to filter and paginate results:

- `startDate` (YYYY-MM-DD) – return transactions on or after this date.
- `endDate` (YYYY-MM-DD) – return transactions on or before this date.
- `limit` – maximum number of records to return. Must be a non-negative integer.
- `offset` – number of records to skip before collecting results. Must be a non-negative integer.

When `startDate` and `endDate` are provided together, transactions are filtered where `transaction_date` falls between the two dates. Invalid dates or negative limits result in a **400 Bad Request** response with a descriptive message.

Responses from `/api/transactions`, `/api/transactions/by-account`, and `/api/transactions/by-category` now include:

```
{
  "transactions": [...],
  "total": 0,
  "hasMore": false
}
```

`total` represents the number of matching transactions, and `hasMore` indicates if more pages are available using the given `limit` and `offset`.
