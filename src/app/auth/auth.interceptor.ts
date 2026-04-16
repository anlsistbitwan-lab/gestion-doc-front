import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isLogin = req.url.includes('/login') || req.url.includes('/usuarios/getpermisosbytercero');

  // NO tocar login
  if (isLogin) {
    return next(req);
  }

  const token = localStorage.getItem('token');

  let newReq = req;

  // agregar Authorization
  if (token) {
    newReq = newReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(newReq);
};
