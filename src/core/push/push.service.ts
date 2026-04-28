import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private initialized = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get<string>('firebase.projectId');
    const clientEmail = this.config.get<string>('firebase.clientEmail');
    const privateKey = this.config.get<string>('firebase.privateKey');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials not set — push notifications disabled',
      );
      return;
    }

    // Prevent double-initialization in watch mode
    if (admin.apps.length > 0) {
      this.initialized = true;
      this.logger.log('Firebase already initialized — reusing existing app');
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      this.initialized = true;
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (err: any) {
      this.logger.error(`Firebase init failed: ${err.message}`);
    }
  }

  async sendToDevice(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.initialized) {
      this.logger.warn(`Push skipped (not initialized): ${title}`);
      return false;
    }

    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data: data ?? {},
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'asiri_jobs' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Push failed for token ${fcmToken}: ${err.message}`);
      return false;
    }
  }

  async sendToMultiple(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.initialized || fcmTokens.length === 0) {
      return { successCount: 0, failureCount: fcmTokens.length };
    }

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: { title, body },
        data: data ?? {},
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'asiri_jobs' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      });
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (err: any) {
      this.logger.error(`Multicast push failed: ${err.message}`);
      return { successCount: 0, failureCount: fcmTokens.length };
    }
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      await admin.messaging().send({
        topic,
        notification: { title, body },
        data: data ?? {},
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Topic push failed: ${err.message}`);
      return false;
    }
  }

  async subscribeToTopic(fcmToken: string, topic: string): Promise<void> {
    if (!this.initialized) return;
    try {
      await admin.messaging().subscribeToTopic([fcmToken], topic);
    } catch (err: any) {
      this.logger.error(`Subscribe to topic failed: ${err.message}`);
    }
  }

  async unsubscribeFromTopic(fcmToken: string, topic: string): Promise<void> {
    if (!this.initialized) return;
    try {
      await admin.messaging().unsubscribeFromTopic([fcmToken], topic);
    } catch (err: any) {
      this.logger.error(`Unsubscribe from topic failed: ${err.message}`);
    }
  }
}