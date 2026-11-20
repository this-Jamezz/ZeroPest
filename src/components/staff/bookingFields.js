export const statuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled']
export const dollars = cents => (cents / 100).toFixed(2)
export const cents = value => Math.round(Number(value) * 100)
export const write = (method, data) => ({ method, body: JSON.stringify(data) })
