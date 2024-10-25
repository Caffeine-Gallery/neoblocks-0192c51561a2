import Int "mo:base/Int";
import Nat "mo:base/Nat";

actor {
  stable var highScore : Nat = 0;

  public func setHighScore(score : Nat) : async () {
    if (score > highScore) {
      highScore := score;
    };
  };

  public query func getHighScore() : async Nat {
    highScore
  };
}
