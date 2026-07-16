export function AccountMenu({ user }) {
  if (!user) {
    return (
      <div className="account-actions">
        <a className="utility-link" href="/login">
          로그인
        </a>
        <a className="primary-button" href="/signup">
          회원가입
        </a>
      </div>
    );
  }

  return (
    <div className="account-actions">
      <a className="utility-link" href="/profile">
        {user.nickname}
      </a>
    </div>
  );
}
