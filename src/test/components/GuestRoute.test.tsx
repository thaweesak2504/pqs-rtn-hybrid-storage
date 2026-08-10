import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import GuestRoute from "../../components/auth/GuestRoute";
import { AuthContext, type AuthContextType } from "../../contexts/AuthContext";

const buildContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  checkAuthStatus: vi.fn(),
  updateAvatar: vi.fn(),
  markPasswordChanged: vi.fn(),
  ...overrides,
});

const renderGuestRoute = (context: AuthContextType) => {
  render(
    <AuthContext.Provider value={context}>
      <MemoryRouter initialEntries={["/signin"]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/signin" element={<div>Sign in page</div>} />
          </Route>
          <Route path="/welcome" element={<div>Welcome page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("GuestRoute", () => {
  it("waits for session restoration before deciding the route", () => {
    renderGuestRoute(buildContext({ isLoading: true }));
    expect(screen.getByRole("status", { name: "กำลังตรวจสอบสถานะผู้ใช้" })).toBeInTheDocument();
    expect(screen.getByText("กำลังตรวจสอบสถานะผู้ใช้")).toHaveClass("sr-only");
    expect(screen.queryByText("Sign in page")).not.toBeInTheDocument();
  });

  it("allows a signed-out user to view sign in", () => {
    renderGuestRoute(buildContext());
    expect(screen.getByText("Sign in page")).toBeInTheDocument();
  });

  it("redirects a restored authenticated user from sign in to welcome", () => {
    renderGuestRoute(buildContext({
      isAuthenticated: true,
      user: { id: "1", username: "editor", email: "editor@test", name: "Editor", role: "editor" },
    }));
    expect(screen.getByText("Welcome page")).toBeInTheDocument();
    expect(screen.queryByText("Sign in page")).not.toBeInTheDocument();
  });
});
