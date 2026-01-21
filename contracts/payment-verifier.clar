;; payment-verifier.clar
;; AgentPay-USDCx - Payment Verification Contract
;; Clarity 4 - Stacks Testnet Only
;;
;; Purpose: Read-only verification of USDCx SIP-010 transfers
;; This contract does NOT handle funds - it only validates transfers

;; ============================================
;; CONSTANTS
;; ============================================

;; USDCx testnet contract reference
(define-constant USDCX_CONTRACT 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx)

;; Error codes
(define-constant ERR_INVALID_AMOUNT (err u1001))
(define-constant ERR_INVALID_RECIPIENT (err u1002))
(define-constant ERR_INVALID_SENDER (err u1003))
(define-constant ERR_AMOUNT_INSUFFICIENT (err u1004))

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

;; Verify that a transfer meets payment requirements
;; This is a helper for off-chain verification logic
;; The actual verification happens via Stacks API inspection
;;
;; @param sender: The principal who sent the payment
;; @param recipient: The expected recipient (server wallet)
;; @param amount: The amount transferred in base units
;; @param required-amount: The minimum required payment
;; @returns: (ok true) if valid, (err code) if invalid
(define-read-only (verify-transfer-params
    (sender principal)
    (recipient principal)
    (amount uint)
    (required-amount uint)
    (expected-recipient principal))
  (begin
    ;; Check recipient matches expected
    (asserts! (is-eq recipient expected-recipient) ERR_INVALID_RECIPIENT)
    ;; Check amount is sufficient (exact or greater)
    (asserts! (>= amount required-amount) ERR_AMOUNT_INSUFFICIENT)
    ;; Check sender is not the recipient (no self-payment)
    (asserts! (not (is-eq sender recipient)) ERR_INVALID_SENDER)
    ;; All checks passed
    (ok true)
  )
)

;; Check if an amount meets the minimum requirement
;; @param amount: The amount to check (in base units)
;; @param required: The minimum required amount
;; @returns: true if amount >= required
(define-read-only (is-amount-sufficient (amount uint) (required uint))
  (>= amount required)
)

;; Check if two principals match
;; @param actual: The actual principal from transaction
;; @param expected: The expected principal
;; @returns: true if they match
(define-read-only (is-recipient-valid (actual principal) (expected principal))
  (is-eq actual expected)
)

;; Get the USDCx contract principal
;; Useful for off-chain verification to confirm correct asset
;; @returns: The USDCx contract principal
(define-read-only (get-usdcx-contract)
  USDCX_CONTRACT
)

;; ============================================
;; PAYMENT AMOUNT UTILITIES
;; ============================================

;; Convert USDCx display amount to base units
;; Example: 0.1 USDCx = input 1, decimals 1 -> 100000 base units
;; This is informational - actual conversion should happen off-chain
;; @param display-amount: Amount in smallest display unit
;; @param display-decimals: How many decimal places in display
;; @returns: Amount in base units (6 decimals)
(define-read-only (to-base-units (display-amount uint) (display-decimals uint))
  (let ((usdcx-decimals u6))
    (if (>= usdcx-decimals display-decimals)
      (* display-amount (pow u10 (- usdcx-decimals display-decimals)))
      (/ display-amount (pow u10 (- display-decimals usdcx-decimals)))
    )
  )
)

;; Standard payment amount for MVP: 0.1 USDCx = 100000 base units
(define-read-only (get-standard-payment-amount)
  u100000
)
