import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../db/storage.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_sih_hackathon_jwt_key_2026_xyz';

export async function register(req, res) {
  try {
    const { name, email, password, creatorProfile } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await UserRepository.create({
      name,
      email,
      password: hashedPassword,
      creatorProfile: creatorProfile || {
        handle: `@${name.toLowerCase().replace(/\s+/g, '_')}`,
        niche: 'Creator Economy & Tech',
        followers: 12500,
        bio: 'Optimizing Instagram organic reach and evergreen content.',
      },
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        creatorProfile: user.creatorProfile,
        baselineWeights: user.baselineWeights,
      },
    });
  } catch (error) {
    console.error('[Auth Ctrl] Register error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        creatorProfile: user.creatorProfile,
        baselineWeights: user.baselineWeights,
      },
    });
  } catch (error) {
    console.error('[Auth Ctrl] Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
}

export async function demoLogin(req, res) {
  try {
    const demoEmail = 'creator.demo@sih2026.io';
    let user = await UserRepository.findByEmail(demoEmail);

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('SIHDemoPass2026!', salt);
      user = await UserRepository.create({
        name: 'Arjun Sharma (Creator)',
        email: demoEmail,
        password: hashedPassword,
        creatorProfile: {
          handle: '@arjun_codes',
          niche: 'Full-Stack Web & System Design',
          followers: 48200,
          bio: 'Building fullstack web apps, breaking down complex software architectures.',
        },
        baselineWeights: {
          engagementWeight: 1.0,
          reachWeight: 0.8,
          savesMultiplier: 2.0,
          sharesMultiplier: 1.5,
          dormantDaysThreshold: 60,
        },
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Logged in as Demo Creator.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        creatorProfile: user.creatorProfile,
        baselineWeights: user.baselineWeights,
      },
    });
  } catch (error) {
    console.error('[Auth Ctrl] Demo login error:', error);
    return res.status(500).json({ success: false, message: 'Failed to authenticate demo user.' });
  }
}

export async function getProfile(req, res) {
  try {
    const user = await UserRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        creatorProfile: user.creatorProfile,
        baselineWeights: user.baselineWeights,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve user profile.' });
  }
}

export async function updateProfile(req, res) {
  try {
    const { name, creatorProfile, baselineWeights } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (creatorProfile) updateData.creatorProfile = creatorProfile;
    if (baselineWeights) updateData.baselineWeights = baselineWeights;

    const updatedUser = await UserRepository.updateById(req.user.id, updateData);
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: 'Profile and baseline settings updated successfully.',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        creatorProfile: updatedUser.creatorProfile,
        baselineWeights: updatedUser.baselineWeights,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user profile.' });
  }
}
