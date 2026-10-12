require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('./src/models');

async function configureAuthority() {
  try {
    const targetEmail = 'authority@foodsafety.com';
    const plainPassword = '123456';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    let authUser = await User.findOne({ where: { email: targetEmail } });

    if (authUser) {
      authUser.password = hashedPassword;
      authUser.role = 'AUTHORIZED_AUTHORITY';
      await authUser.save();
      console.log(`Updated existing user: ${targetEmail}`);
    } else {
      authUser = await User.create({
        name: 'Food Safety Authority Officer',
        email: targetEmail,
        phone: '9876543210',
        password: hashedPassword,
        role: 'AUTHORIZED_AUTHORITY'
      });
      console.log(`Created new authority user: ${targetEmail} (ID: ${authUser.id})`);
    }

    // Also update authority@fssai.gov password so both emails work with 123456
    const fssaiUser = await User.findOne({ where: { email: 'authority@fssai.gov' } });
    if (fssaiUser) {
      fssaiUser.password = hashedPassword;
      await fssaiUser.save();
      console.log(`Updated authority@fssai.gov password to ${plainPassword}`);
    }

    // Verify bcrypt check
    const check1 = await bcrypt.compare(plainPassword, authUser.password);
    console.log(`Verification: authority@foodsafety.com password matches '123456' -> ${check1}`);

    const allUsers = await User.findAll({ attributes: ['id', 'name', 'email', 'role'] });
    console.log('\nAll registered users:');
    console.table(allUsers.map(u => u.toJSON()));

    process.exit(0);
  } catch (err) {
    console.error('Failed to configure authority account:', err);
    process.exit(1);
  }
}

configureAuthority();
