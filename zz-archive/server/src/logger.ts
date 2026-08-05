const log = (level: string, msg: string, data?: object) => {
    const line = JSON.stringify({ts: new Date().toISOString(), level, msg, ...data})
    if (level === 'error') {
        console.error(line)
    } else {
        console.log(line)
    }
}

export const logger = {
    info:  (msg: string, data?: object) => log('info',  msg, data),
    warn:  (msg: string, data?: object) => log('warn',  msg, data),
    error: (msg: string, data?: object) => log('error', msg, data),
}
