import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';


@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    constructor(private cookieService: CookieService) {
        
    }
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
     
    // var newHeader = new HttpHeaders();
    var clonedRequest ; 
    //const token = this.cookieService.get('accesstoken') || ''
    const token = localStorage.getItem('accesstoken') || ''
    clonedRequest = request.clone({ 
        withCredentials: true,
        headers: request.headers.set('accesstoken', token)
    });
    return next.handle(clonedRequest).pipe(
        catchError((error: HttpErrorResponse) => {
            // Handle the error here
            console.error('error occurred in exception:', error);
            //throw error as per requirement
            if (error.status === 403){ // access key is expired, delete user infor from local storage
                console.log("access key is expired"); 
                localStorage.removeItem('userInfo'); 
                localStorage.removeItem('accesstoken'); 
                localStorage.removeItem('refreshtoken'); 
            }
            return throwError(error);
        }));
    }
    
}