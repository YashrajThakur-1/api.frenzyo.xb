const passport = require("passport");
const User = require("../model/UserSchema");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      const { id, displayName, emails, photos } = profile;
      console.log("Google profile received:", profile);
      try {
        let user = await User.findOne({ googleId: id });
        console.log("User found in database:", user);

        if (!user) {
          user = new User({
            googleId: id,
            name: displayName,
            email: emails[0].value,
            profile_picture: photos[0].value,
          });
          await user.save();
          console.log("New user created:", user);
        }
        done(null, user);
      } catch (err) {
        console.log("Error during Google authentication:", err);
        done(err, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    console.log("Deserializing user:", user);
    done(null, user);
  } catch (err) {
    console.log("Error during deserialization:", err);
    done(err, false);
  }
});
