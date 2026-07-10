import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class InterceptorService implements HttpInterceptor {
  
  
  constructor(
    private readonly _router: Router,
    private readonly route: ActivatedRoute,
  
  ) { }

  intercept(
    request:any, next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // const object = localStorage.getItem('userInfo') && JSON.parse(localStorage.getItem('userInfo'));
    const token  = localStorage.getItem('access_token')
    // const Jwt = object && object.Jwt;
    // let userID = object && object.UserId;
    let type:any = { 'Content-Type': 'application/json; charset=utf-8' };
      if (token) {
        if(request.url.indexOf('companylogo') > -1){
          type = {}
        }
        request = request.clone({
            setHeaders: {
              ...type,
              // 'dataType': 'json',
            //   'userid': `${userID}`,
              'Authorization': `Bearer ${token}`
            }
        });
    } 
 

   

    return next.handle(request).pipe(
      catchError((err: HttpErrorResponse) => {
               
                // Checking if it is an Authentication Error (401)
                if (err.status === 401) {
                  // <Log the user out of your application code>
                  this._router.navigate([ 'login' ]);
                  // return throwError(err);
                }
                // If it is not an authentication error, just throw it
        return throwError(err);
      }),
      finalize(()=>{
        
      })
      

    );
  }
}
