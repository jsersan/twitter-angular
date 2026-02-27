import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { environment } from '../environments/environment';

// Routing
import { AppRoutingModule } from './app-routing.module';

// Components
import { AppComponent } from './app.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { ProfileComponent } from './components/profile/profile.component';
import { ExploreComponent } from './components/explore/explore.component';
import { AdminComponent } from './components/admin/admin.component';
import { TweetCardComponent } from './components/tweet-card/tweet-card.component';
import { ToastComponent } from './components/toast/toast.component';
import { NotificationsComponent } from './components/notifications/notifications.component';

// Pipes
import { TimeAgoPipe } from './pipes/time-ago.pipe';

// Services
import { ToastService } from './services/toast.service';
import { ReportService } from './services/report.service';
import { ImageUploadService } from './services/image-upload.service';
import { NotificationService } from './services/notification.service';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    ProfileComponent,
    ExploreComponent,
    AdminComponent,
    TweetCardComponent,
    ToastComponent,
    NotificationsComponent,
    TimeAgoPipe
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AppRoutingModule
  ],
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    ToastService,
    ReportService,
    ImageUploadService,
    NotificationService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}