export enum ActivityAction {
    REGISTER = 'register',
    LOGIN = 'login',
    LOGIN_FAILED = 'login_failed',
    LOGOUT = 'logout',
    LOGOUT_ALL = 'logout_all',
    CHANGE_PASSWORD = 'change_password',
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    RESTORE = 'restore',
    ORDER_PLACED = 'order_placed',
    ORDER_STATUS_CHANGED = 'order_status_changed',
    ORDER_CANCELLED = 'order_cancelled',
    PUBLISH = 'publish',
}

export enum ActivityStatus {
    SUCCESS = 'success',
    FAILED = 'failed',
}
