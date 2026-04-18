import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingOverlayService {
  private visibility = new BehaviorSubject<boolean>(false);
  private progressValue = new BehaviorSubject<number>(0);

  visibility$ = this.visibility.asObservable();
  progress$ = this.progressValue.asObservable();

  show() { this.visibility.next(true); }
  hide() { this.visibility.next(false); }
  setProgress(value: number) { this.progressValue.next(value); }
}
