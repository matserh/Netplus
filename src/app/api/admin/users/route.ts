import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/beta-config';

// GET /api/admin/users — List all users with beta access info
export async function GET(req: NextRequest) {
  try {
    const adminEmail = req.headers.get('x-admin-email');
    if (!adminEmail || adminEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        betaAccess: true,
        profiles: { select: { name: true, type: true, isDefault: true } },
        invitationsCreated: {
          select: { id: true, code: true, status: true, useCount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    // Also count invitations and active users
    const totalInvitations = await db.betaInvitation.count();
    const activeInvitations = await db.betaInvitation.count({ where: { status: 'active' } });
    const activeBetaUsers = await db.betaAccess.count({ where: { status: 'active' } });
    const bannedUsers = await db.betaAccess.count({ where: { status: 'banned' } });
    const pausedUsers = await db.betaAccess.count({ where: { status: 'paused' } });

    return NextResponse.json({
      users,
      stats: { totalInvitations, activeInvitations, activeBetaUsers, bannedUsers, pausedUsers },
    });
  } catch (error) {
    console.error('[admin/users] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH /api/admin/users — Update user status (ban, pause, activate, grant admin)
export async function PATCH(req: NextRequest) {
  try {
    const adminEmail = req.headers.get('x-admin-email');
    if (!adminEmail || adminEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { userId, action } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ error: 'userId et action requis' }, { status: 400 });
    }

    // Don't allow admin to modify themselves
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    switch (action) {
      case 'ban': {
        await db.user.update({ where: { id: userId }, data: { status: 'banned' } });
        await db.betaAccess.upsert({
          where: { userId },
          create: { userId, status: 'banned', grantedBy: adminEmail },
          update: { status: 'banned' },
        });
        break;
      }
      case 'pause': {
        await db.user.update({ where: { id: userId }, data: { status: 'paused' } });
        await db.betaAccess.upsert({
          where: { userId },
          create: { userId, status: 'paused', grantedBy: adminEmail },
          update: { status: 'paused' },
        });
        break;
      }
      case 'activate': {
        await db.user.update({ where: { id: userId }, data: { status: 'active' } });
        await db.betaAccess.upsert({
          where: { userId },
          create: { userId, status: 'active', grantedBy: adminEmail },
          update: { status: 'active' },
        });
        break;
      }
      case 'grant_beta': {
        await db.betaAccess.upsert({
          where: { userId },
          create: { userId, status: 'active', grantedBy: adminEmail },
          update: { status: 'active' },
        });
        break;
      }
      case 'revoke_beta': {
        await db.betaAccess.deleteMany({ where: { userId } });
        break;
      }
      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/users] PATCH Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}