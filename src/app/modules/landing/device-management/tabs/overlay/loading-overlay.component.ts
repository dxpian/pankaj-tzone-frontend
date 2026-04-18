import { Component } from '@angular/core';
import { LoadingOverlayService } from './loading-overlay.service';

@Component({
  selector: 'app-loading-overlay',
  templateUrl: './loading-overlay.component.html',
  styleUrls: ['./loading-overlay.component.scss']
})
export class LoadingOverlayComponent {
  visible = false;
  progress = 0;

  constructor(private overlayService: LoadingOverlayService) {
    this.overlayService.visibility$.subscribe(v => this.visible = v);
    this.overlayService.progress$.subscribe(p => this.progress = p);
  }
}
