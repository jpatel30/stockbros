import Cookies from 'js-cookie'

export const setToken = (token: string) =>
  Cookies.set('token', token, { expires: 30 })

export const getToken = () => Cookies.get('token')

export const clearToken = () => Cookies.remove('token')

export const isLoggedIn = () => !!getToken()
