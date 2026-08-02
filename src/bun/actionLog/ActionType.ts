export type ActionType =
    | 'create-account' | 'update-account' | 'delete-account'
    | 'create-vendor' | 'update-vendor' | 'delete-vendor'
    | 'create-transaction' | 'update-transaction' | 'delete-transaction'
    | 'create-balance-assertion' | 'update-balance-assertion' | 'delete-balance-assertion'
    | 'create-origin'

export const ACTION_TYPES: readonly ActionType[] = [
    'create-account', 'update-account', 'delete-account',
    'create-vendor', 'update-vendor', 'delete-vendor',
    'create-transaction', 'update-transaction', 'delete-transaction',
    'create-balance-assertion', 'update-balance-assertion', 'delete-balance-assertion',
    'create-origin',
]
